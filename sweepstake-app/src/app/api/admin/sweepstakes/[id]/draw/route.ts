import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get("x-admin-key");
  return authHeader === process.env.ADMIN_SECRET;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(_request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        entries: true,
        horses: { where: { isNonRunner: false } },
      },
    });

    if (!sweepstake) {
      return NextResponse.json({ error: "Sweepstake not found" }, { status: 404 });
    }

    if (sweepstake.status === "drawn" || sweepstake.status === "completed") {
      return NextResponse.json(
        { error: "Draw has already been performed" },
        { status: 400 }
      );
    }

    const entries = sweepstake.entries;
    const horses = sweepstake.horses;

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No entries to draw" },
        { status: 400 }
      );
    }

    if (horses.length < entries.length) {
      return NextResponse.json(
        {
          error: `Not enough horses (${horses.length}) for entries (${entries.length}). Add more horses or remove non-runners.`,
        },
        { status: 400 }
      );
    }

    const shuffledHorses = shuffle(horses);
    const shuffledEntries = shuffle(entries);

    await prisma.$transaction(
      shuffledEntries.map((entry, i) =>
        prisma.entry.update({
          where: { id: entry.id },
          data: { horseId: shuffledHorses[i].id },
        })
      )
    );

    await prisma.sweepstake.update({
      where: { id },
      data: { status: "drawn" },
    });

    const updated = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        entries: { include: { horse: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Draw completed successfully",
      sweepstake: updated,
    });
  } catch (error) {
    console.error("Failed to run draw:", error);
    return NextResponse.json(
      { error: "Failed to run draw" },
      { status: 500 }
    );
  }
}
