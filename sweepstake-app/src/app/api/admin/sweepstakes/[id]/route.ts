import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get("x-admin-key");
  return authHeader === process.env.ADMIN_SECRET;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sweepstake = await prisma.sweepstake.findUnique({
      where: { id },
      include: {
        horses: { orderBy: { name: "asc" } },
        entries: { include: { horse: true } },
        results: { include: { horse: true }, orderBy: { position: "asc" } },
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
    const { status } = body;

    const validStatuses = ["draft", "open", "closed", "drawn", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const sweepstake = await prisma.sweepstake.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(sweepstake);
  } catch (error) {
    console.error("Failed to update sweepstake:", error);
    return NextResponse.json(
      { error: "Failed to update sweepstake" },
      { status: 500 }
    );
  }
}
