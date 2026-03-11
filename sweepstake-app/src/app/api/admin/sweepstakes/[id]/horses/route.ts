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

    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });

    if (!sweepstake) {
      return NextResponse.json({ error: "Sweepstake not found" }, { status: 404 });
    }

    if (sweepstake._count.entries > 0) {
      return NextResponse.json(
        { error: "Cannot add horses after entries have been made" },
        { status: 400 }
      );
    }

    const horses = Array.isArray(body) ? body : [body];
    const names = horses
      .map((h: { name?: string }) => h?.name?.trim())
      .filter(Boolean);

    if (names.length === 0) {
      return NextResponse.json(
        { error: "At least one horse name is required" },
        { status: 400 }
      );
    }

    const created = await prisma.horse.createMany({
      data: (names as string[]).map((name) => ({
        sweepstakeId: id,
        name,
      })),
    });

    const allHorses = await prisma.horse.findMany({
      where: { sweepstakeId: id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ created: created.count, horses: allHorses });
  } catch (error) {
    console.error("Failed to add horses:", error);
    return NextResponse.json(
      { error: "Failed to add horses" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { horseId, isNonRunner } = body;

    if (!horseId) {
      return NextResponse.json(
        { error: "Horse ID is required" },
        { status: 400 }
      );
    }

    const horse = await prisma.horse.findFirst({
      where: { id: horseId, sweepstakeId: id },
    });

    if (!horse) {
      return NextResponse.json({ error: "Horse not found" }, { status: 404 });
    }

    const updated = await prisma.horse.update({
      where: { id: horseId },
      data: { isNonRunner: Boolean(isNonRunner) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update horse:", error);
    return NextResponse.json(
      { error: "Failed to update horse" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const horseId = searchParams.get("horseId");

    if (!horseId) {
      return NextResponse.json(
        { error: "Horse ID is required" },
        { status: 400 }
      );
    }

    const horse = await prisma.horse.findFirst({
      where: { id: horseId, sweepstakeId: id },
      include: { entry: true },
    });

    if (!horse) {
      return NextResponse.json({ error: "Horse not found" }, { status: 404 });
    }

    if (horse.entry) {
      return NextResponse.json(
        { error: "Cannot delete horse that has been assigned to an entry" },
        { status: 400 }
      );
    }

    await prisma.horse.delete({
      where: { id: horseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete horse:", error);
    return NextResponse.json(
      { error: "Failed to delete horse" },
      { status: 500 }
    );
  }
}
