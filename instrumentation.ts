export async function register() {
  // Only run in Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { default: prisma } = await import("./lib/db");

    const migrations: { sql: string; label: string }[] = [
      {
        sql: "ALTER TABLE trips ADD COLUMN user_id TEXT",
        label: "trips.user_id",
      },
      {
        sql: "ALTER TABLE users ADD COLUMN avatar TEXT",
        label: "users.avatar",
      },
      {
        sql: "ALTER TABLE reservations ADD COLUMN attachment_url TEXT",
        label: "reservations.attachment_url",
      },
      {
        sql: "ALTER TABLE reservations ADD COLUMN travelers INTEGER NOT NULL DEFAULT 2",
        label: "reservations.travelers",
      },
    ];

    for (const { sql, label } of migrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`[migration] Added column: ${label}`);
      } catch {
        // Column already exists — safe to ignore
      }
    }
  }
}
