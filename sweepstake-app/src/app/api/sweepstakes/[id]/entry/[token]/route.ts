import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  try {
    const { id, token } = await params;

    const entry = await prisma.entry.findFirst({
      where: {
        sweepstakeId: id,
        entryToken: token.toUpperCase(),
      },
      include: {
        horse: true,
        sweepstake: {
          include: {
            results: {
              include: { horse: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to fetch entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch entry" },
      { status: 500 }
    );
  }
}
