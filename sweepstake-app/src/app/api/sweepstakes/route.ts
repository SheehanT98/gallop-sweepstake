import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sweepstakes = await prisma.sweepstake.findMany({
      where: {
        status: { in: ["open", "closed", "drawn", "completed"] },
      },
      orderBy: { eventDate: "desc" },
      include: {
        _count: {
          select: { entries: true, horses: true },
        },
      },
    });
    return NextResponse.json(sweepstakes);
  } catch (error) {
    console.error("Failed to fetch sweepstakes:", error);
    return NextResponse.json(
      { error: "Failed to fetch sweepstakes" },
      { status: 500 }
    );
  }
}
