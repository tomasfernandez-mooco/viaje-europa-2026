import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  // Validate type and size (max 5MB)
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no válido (JPG, PNG, WEBP)" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo supera el límite de 5MB" }, { status: 400 });
  }

  try {
    const blob = await put(`trips/${user.id}-${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}
