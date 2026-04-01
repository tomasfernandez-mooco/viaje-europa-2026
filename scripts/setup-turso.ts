import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("❌ Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

const statements = [
  // Drop old tables
  `DROP TABLE IF EXISTS "trip_items"`,
  `DROP TABLE IF EXISTS "config"`,
  // Drop new tables (in dependency order)
  `DROP TABLE IF EXISTS "itinerary_items"`,
  `DROP TABLE IF EXISTS "checklist_items"`,
  `DROP TABLE IF EXISTS "expenses"`,
  `DROP TABLE IF EXISTS "locations"`,
  `DROP TABLE IF EXISTS "reservations"`,
  `DROP TABLE IF EXISTS "trip_config"`,
  `DROP TABLE IF EXISTS "users"`,
  `DROP TABLE IF EXISTS "trips"`,

  // Create tables
  `CREATE TABLE "trips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "password" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'traveler',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE "trip_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    UNIQUE("tripId", "key")
  )`,

  `CREATE TABLE "reservations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT,
    "subtype" TEXT,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "provider" TEXT,
    "confirmationNumber" TEXT,
    "reservationUrl" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "priceUSD" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'por-reservar',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "startDate" TEXT,
    "endDate" TEXT,
    "freeCancellation" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "deadlineDate" TEXT,
    "alert" TEXT,
    "travelers" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE "itinerary_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "date" TEXT,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "country" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "alertLevel" TEXT,
    "reservationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE "locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "lat" REAL,
    "lng" REAL,
    "image" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "dateRange" TEXT
  )`,

  `CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "category" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "amountUSD" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "date" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function main() {
  console.log("🔗 Conectando a Turso:", tursoUrl);
  for (const sql of statements) {
    const name = sql.match(/"(\w+)"/)?.[1] ?? "?";
    try {
      await client.execute(sql);
      console.log(`✅ ${name}`);
    } catch (e: any) {
      console.log(`⚠️  ${name}: ${e.message}`);
    }
  }
  console.log("\n🎉 Schema Turso listo!");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
