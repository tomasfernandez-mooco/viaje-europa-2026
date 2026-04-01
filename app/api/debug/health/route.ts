import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const prismaStatus = prisma ? "✅ Prisma initialized" : "❌ Prisma is undefined";
    
    let userStatus = "unknown";
    try {
      const user = await getCurrentUser();
      userStatus = user ? `✅ User found: ${user.id}` : "⚠️ No authenticated user";
    } catch (e) {
      userStatus = `❌ Auth error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    let dbStatus = "unknown";
    try {
      if (prisma) {
        const result = await prisma.$queryRaw`SELECT 1`;
        dbStatus = "✅ Database connected";
      } else {
        dbStatus = "❌ Prisma not initialized";
      }
    } catch (e) {
      dbStatus = `❌ DB error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return NextResponse.json({
      prisma: prismaStatus,
      user: userStatus,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack",
    }, { status: 500 });
  }
}
