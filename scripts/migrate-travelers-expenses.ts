import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("❌ Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

const migrations = [
  `CREATE TABLE IF NOT EXISTS "travelers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "userId" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE
  )`,
  `ALTER TABLE "expenses" ADD COLUMN "paidByTravelerId" TEXT REFERENCES "travelers"("id") ON DELETE SET NULL`,
  `ALTER TABLE "expenses" ADD COLUMN "splitBetween" TEXT`,
  `ALTER TABLE "expenses" ADD COLUMN "splitType" TEXT DEFAULT 'equal'`,
];

async function run() {
  for (const sql of migrations) {
    const preview = sql.trim().slice(0, 60).replace(/\n/g, " ");
    try {
      await client.execute(sql);
      console.log(`✅ ${preview}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log(`⏭️  Already applied: ${preview}...`);
      } else {
        console.error(`❌ Failed: ${preview}...`);
        console.error(msg);
        process.exit(1);
      }
    }
  }
  console.log("\n✅ Migration complete");
}

run();