export async function register() {
  // Only run in Node.js runtime (not edge), only in production
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { default: prisma } = await import("./lib/db");
    // Add userId column to trips if it doesn't exist yet (Turso migration)
    try {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE trips ADD COLUMN user_id TEXT REFERENCES users(id)"
      );
      console.log("[migration] Added user_id column to trips");
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
