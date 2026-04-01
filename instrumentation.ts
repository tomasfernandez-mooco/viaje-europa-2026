export async function register() {
  // Only run in Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { default: prisma } = await import("./lib/db");

    // Column names must match Prisma's generated SQL (camelCase, no @map on fields)
    const migrations: { sql: string; label: string }[] = [
      {
        sql: 'ALTER TABLE trips ADD COLUMN "userId" TEXT',
        label: "trips.userId",
      },
      {
        sql: 'ALTER TABLE users ADD COLUMN "avatar" TEXT',
        label: "users.avatar",
      },
      {
        sql: 'ALTER TABLE reservations ADD COLUMN "attachmentUrl" TEXT',
        label: "reservations.attachmentUrl",
      },
      {
        sql: 'ALTER TABLE reservations ADD COLUMN "travelers" INTEGER NOT NULL DEFAULT 2',
        label: "reservations.travelers",
      },
      {
        sql: 'ALTER TABLE reservations ADD COLUMN "travelerIds" TEXT',
        label: "reservations.travelerIds",
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS "trip_members" ("id" TEXT NOT NULL PRIMARY KEY, "tripId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'viewer', "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE, FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE, UNIQUE("tripId", "userId"))`,
        label: "trip_members table",
      },
      { sql: 'ALTER TABLE itinerary_items ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0', label: "itinerary_items.orderIndex" },
      {
        sql: `CREATE TABLE IF NOT EXISTS "telegram_sessions" ("chatId" TEXT NOT NULL PRIMARY KEY, "state" TEXT NOT NULL, "data" TEXT, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
        label: "telegram_sessions table",
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
