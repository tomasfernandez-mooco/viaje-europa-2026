import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  try {
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      console.log("[db] Initializing Prisma with Turso adapter");
      console.log("[db] Creating Turso libsql client...");
      try {
        const libsql = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
        });
        console.log("[db] libsql client created successfully");

        console.log("[db] Creating PrismaLibSQL adapter...");
        const adapter = new PrismaLibSQL(libsql);
        console.log("[db] PrismaLibSQL adapter created successfully");

        console.log("[db] Creating PrismaClient with adapter...");
        const client = new PrismaClient({ adapter } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
        console.log("[db] Prisma initialized successfully with Turso");
        return client;
      } catch (adapterErr) {
        const msg = adapterErr instanceof Error ? `${adapterErr.name}: ${adapterErr.message}` : String(adapterErr);
        const stack = adapterErr instanceof Error ? adapterErr.stack : "No stack";
        console.error("[db] Error during adapter/client initialization:", msg);
        console.error("[db] Stack:", stack);
        throw adapterErr;
      }
    }
    console.log("[db] Turso env not found, using default PrismaClient");
    return new PrismaClient();
  } catch (err) {
    console.error("[db] Error creating Prisma client:", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

let prisma: PrismaClient | undefined;
try {
  prisma = global.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") global.prisma = prisma;
  console.log("[db] Module export: prisma client ready");
} catch (err) {
  const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const stack = err instanceof Error ? err.stack : "No stack available";
  console.error("[db] Failed to initialize prisma:", errorMsg);
  console.error("[db] Stack trace:", stack);
  prisma = undefined;
}

export default prisma;
