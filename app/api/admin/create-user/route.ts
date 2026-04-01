import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("X-Admin-Secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, name } = await request.json();

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { name },
      create: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash: "temp",
        role: "user",
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("[admin create-user]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
