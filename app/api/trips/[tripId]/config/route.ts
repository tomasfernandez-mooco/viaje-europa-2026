import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const configs = await prisma.tripConfig.findMany({
      where: { tripId },
    });
    const record: Record<string, string> = {};
    for (const cfg of configs) {
      record[cfg.key] = cfg.value;
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("Error fetching trip config:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip config" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body: Record<string, string> = await request.json();

    const upserts = Object.entries(body).map(([key, value]) =>
      prisma.tripConfig.upsert({
        where: { tripId_key: { tripId, key } },
        update: { value },
        create: { tripId, key, value },
      })
    );
    await Promise.all(upserts);

    const configs = await prisma.tripConfig.findMany({
      where: { tripId },
    });
    const record: Record<string, string> = {};
    for (const cfg of configs) {
      record[cfg.key] = cfg.value;
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating trip config:", error);
    return NextResponse.json(
      { error: "Failed to update trip config" },
      { status: 500 }
    );
  }
}
