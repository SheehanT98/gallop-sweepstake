import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get("x-admin-key");
  return authHeader === process.env.ADMIN_SECRET;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { results } = body; // [{ horseId, position }, ...]

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "Results array is required with at least one placement" },
        { status: 400 }
      );
    }

    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: { horses: true },
    });

    if (!sweepstake) {
      return NextResponse.json({ error: "Sweepstake not found" }, { status: 404 });
    }

    const pointsMap: Record<number, number> = {
      1: sweepstake.pointsFirst,
      2: sweepstake.pointsSecond,
      3: sweepstake.pointsThird,
    };

    const validResults = results
      .filter(
        (r: { horseId?: string; position?: number }) =>
          r.horseId && r.position != null && r.position >= 1 && r.position <= 3
      )
      .map((r: { horseId: string; position: number }) => ({
        horseId: r.horseId,
        position: r.position,
        points: pointsMap[r.position] ?? 0,
      }));

    const positions = validResults.map((r) => r.position);
    if (new Set(positions).size !== positions.length) {
      return NextResponse.json(
        { error: "Duplicate positions not allowed" },
        { status: 400 }
      );
    }

    const horseIds = validResults.map((r) => r.horseId);
    const validHorses = sweepstake.horses.filter((h) => horseIds.includes(h.id));
    if (validHorses.length !== horseIds.length) {
      return NextResponse.json(
        { error: "All horse IDs must belong to this sweepstake" },
        { status: 400 }
      );
    }

    await prisma.raceResult.deleteMany({
      where: { sweepstakeId: id },
    });

    await prisma.raceResult.createMany({
      data: validResults.map((r) => ({
        sweepstakeId: id,
        horseId: r.horseId,
        position: r.position,
        points: r.points,
      })),
    });

    await prisma.sweepstake.update({
      where: { id },
      data: { status: "completed" },
    });

    const updated = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        results: { include: { horse: true }, orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Results saved successfully",
      sweepstake: updated,
    });
  } catch (error) {
    console.error("Failed to save results:", error);
    return NextResponse.json(
      { error: "Failed to save results" },
      { status: 500 }
    );
  }
}
