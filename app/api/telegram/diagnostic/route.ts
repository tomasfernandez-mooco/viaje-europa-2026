import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  sendMessage,
  getSession,
  upsertSession,
  clearSession,
} from "@/lib/telegram-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: Check if prisma is defined
  try {
    results.tests = { ...results.tests, prisma_defined: !!prisma };
  } catch (e) {
    results.tests = { ...results.tests, prisma_check: `Error: ${e}` };
  }

  // Test 2: Try to access prisma.telegramSession
  try {
    if (!prisma) {
      results.tests = {
        ...results.tests,
        prisma_telegram_session: "FAILED: prisma is undefined",
      };
    } else {
      const count = await prisma.telegramSession.count();
      results.tests = {
        ...results.tests,
        prisma_telegram_session: `OK: ${count} sessions`,
      };
    }
  } catch (e) {
    results.tests = {
      ...results.tests,
      prisma_telegram_session: `Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Test 3: Try getSession
  try {
    const session = await getSession("TEST_CHAT_ID");
    results.tests = {
      ...results.tests,
      get_session: session ? "Found session" : "No session (expected)",
    };
  } catch (e) {
    results.tests = {
      ...results.tests,
      get_session: `Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Test 4: Try upsertSession
  try {
    await upsertSession("TEST_CHAT_ID", "test_state", { test: "data" });
    results.tests = {
      ...results.tests,
      upsert_session: "OK",
    };
  } catch (e) {
    results.tests = {
      ...results.tests,
      upsert_session: `Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Test 5: Try getSession again
  try {
    const session = await getSession("TEST_CHAT_ID");
    results.tests = {
      ...results.tests,
      get_session_after_upsert: session
        ? `Found: state=${session.state}`
        : "Not found (error)",
    };
  } catch (e) {
    results.tests = {
      ...results.tests,
      get_session_after_upsert: `Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Test 6: Try clearSession
  try {
    await clearSession("TEST_CHAT_ID");
    results.tests = {
      ...results.tests,
      clear_session: "OK",
    };
  } catch (e) {
    results.tests = {
      ...results.tests,
      clear_session: `Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Test 7: Test sendMessage (without actually sending)
  try {
    results.tests = {
      ...results.tests,
      send_message_env: `TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? "present" : "missing"}`,
    };
  } catch (e) {
    results.tests = {
      ...results.tests,
      send_message_env: `Error: ${e}`,
    };
  }

  return NextResponse.json(results);
}
