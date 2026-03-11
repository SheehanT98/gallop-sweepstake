import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get("x-admin-key");
  return authHeader === process.env.ADMIN_SECRET;
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sweepstakes = await prisma.sweepstake.findMany({
      orderBy: { eventDate: "desc" },
      include: {
        _count: {
          select: { entries: true, horses: true, results: true },
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

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      eventDate,
      entryDeadline,
      maxParticipants,
      pointsFirst = 10,
      pointsSecond = 5,
      pointsThird = 2,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const sweepstake = await prisma.sweepstake.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        eventDate: new Date(eventDate || Date.now()),
        entryDeadline: new Date(entryDeadline || Date.now()),
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        pointsFirst: parseInt(pointsFirst, 10) || 10,
        pointsSecond: parseInt(pointsSecond, 10) || 5,
        pointsThird: parseInt(pointsThird, 10) || 2,
        status: "draft",
      },
    });

    return NextResponse.json(sweepstake);
  } catch (error) {
    console.error("Failed to create sweepstake:", error);
    return NextResponse.json(
      { error: "Failed to create sweepstake" },
      { status: 500 }
    );
  }
}
