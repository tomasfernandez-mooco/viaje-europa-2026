import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const token = await createToken({ id: user.id, email: user.email, role: user.role });
    setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("LOGIN ERROR:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
