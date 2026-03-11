import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEntryToken } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { participantName, participantEmail } = body;

    if (!participantName?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true, horses: true } },
      },
    });

    if (!sweepstake) {
      return NextResponse.json({ error: "Sweepstake not found" }, { status: 404 });
    }

    if (sweepstake.status !== "open") {
      return NextResponse.json(
        { error: `Entries are closed. Sweepstake is ${sweepstake.status}.` },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now > sweepstake.entryDeadline) {
      return NextResponse.json(
        { error: "Entry deadline has passed" },
        { status: 400 }
      );
    }

    if (
      sweepstake.maxParticipants &&
      sweepstake._count.entries >= sweepstake.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Sweepstake is full" },
        { status: 400 }
      );
    }

    if (sweepstake._count.horses === 0) {
      return NextResponse.json(
        { error: "No horses have been added to this sweepstake yet" },
        { status: 400 }
      );
    }

    let entryToken: string;
    let attempts = 0;
    do {
      entryToken = generateEntryToken();
      const existing = await prisma.entry.findFirst({
        where: { entryToken },
      });
      if (!existing) break;
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: "Please try again" },
          { status: 500 }
        );
      }
    } while (true);

    const entry = await prisma.entry.create({
      data: {
        sweepstakeId: id,
        participantName: participantName.trim(),
        participantEmail: participantEmail?.trim() || null,
        entryToken,
      },
    });

    return NextResponse.json({
      success: true,
      entryToken,
      message:
        "You're in! Save your entry link - you'll need it to see your horse after the draw.",
    });
  } catch (error) {
    console.error("Failed to enter sweepstake:", error);
    return NextResponse.json(
      { error: "Failed to enter sweepstake" },
      { status: 500 }
    );
  }
}
