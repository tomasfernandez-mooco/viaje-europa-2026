import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("X-Admin-Secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, nombre y contraseña son requeridos" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    let user;
    if (existing) {
      // Update name and password if user already exists
      user = await prisma.user.update({
        where: { email: email.toLowerCase().trim() },
        data: { name, password: hashed },
      });
    } else {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: email.toLowerCase().trim(),
          name,
          password: hashed,
          role: "traveler",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[admin create-user]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
