import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        horses: {
          where: { isNonRunner: false },
          orderBy: { name: "asc" },
        },
        results: {
          include: { horse: true },
          orderBy: { position: "asc" },
        },
        _count: { select: { entries: true } },
      },
    });

    if (!sweepstake) {
      return NextResponse.json({ error: "Sweepstake not found" }, { status: 404 });
    }

    return NextResponse.json(sweepstake);
  } catch (error) {
    console.error("Failed to fetch sweepstake:", error);
    return NextResponse.json(
      { error: "Failed to fetch sweepstake" },
      { status: 500 }
    );
  }
}
