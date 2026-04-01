# Fix Vercel Build Failures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diagnose and resolve the "Unexpected error. Please try again later" Vercel build failures so that the PDF support for Telegram bot can be deployed to production.

**Architecture:** The plan follows a diagnostic-first approach: (1) examine Vercel logs and recent successful builds to understand the failure pattern, (2) clean up corrupted local build artifacts that may be causing issues, (3) validate all environment variables are present and correct, (4) check for configuration issues in vercel.json and next.config, (5) force a fresh build with clean caches on Vercel, and (6) monitor the deployment to ensure success.

**Tech Stack:** Next.js 15, Vercel deployment platform, Prisma ORM with Turso database adapter, Node.js

---

## Task 1: Examine Vercel Build Logs and Identify Failure Pattern

**Files:**
- Reference: `.vercel/project.json` (read-only, to get project ID)
- Reference: Previous build outputs from `npx vercel list`

- [ ] **Step 1: Get the latest failed deployment details**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel list --prod 2>&1 | head -5
```

Expected: Output showing recent deployments with "Error" status. Note the deployment URL of the most recent failure.

- [ ] **Step 2: Fetch detailed build logs from the latest error deployment**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
LATEST_DEPLOY_URL="https://europa-2026-kyt9750x7-tomasfernandez-moocos-projects.vercel.app"
npx vercel inspect $LATEST_DEPLOY_URL 2>&1 | head -50
```

Expected: Detailed output showing build configuration and any error messages. If this doesn't show logs, try accessing the Vercel dashboard directly.

- [ ] **Step 3: Compare with last successful deployment (4 hours ago)**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
LAST_SUCCESS_URL="https://europa-2026-iti7lqoas-tomasfernandez-moocos-projects.vercel.app"
npx vercel inspect $LAST_SUCCESS_URL 2>&1 | head -50
```

Expected: Note the key differences in build configuration or environment between success and failure.

- [ ] **Step 4: Document findings**

Create a mental note of:
- When the failures started (after which deployment)
- What changed between last success and first failure (code or environment)
- Any patterns in the error messages

---

## Task 2: Clean Up Local Build Artifacts and Cache

**Files:**
- Remove: `.next/` (Next.js build output)
- Remove: `.vercel/` (Vercel metadata, will be regenerated)
- Remove: `node_modules/.cache` (dependency cache)
- Remove: `.git/index.lock` (git lock file if present)

- [ ] **Step 1: Remove Next.js build directory**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
rm -rf .next
echo "✅ Removed .next directory"
```

Expected: Clean removal, no errors.

- [ ] **Step 2: Remove Vercel metadata**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
rm -rf .vercel
echo "✅ Removed .vercel directory"
```

Expected: Clean removal. This will be regenerated on next deploy.

- [ ] **Step 3: Clean dependency cache**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
rm -rf node_modules/.cache 2>/dev/null || true
npm cache clean --force
echo "✅ Cleaned npm cache"
```

Expected: Cache cleanup completes without errors.

- [ ] **Step 4: Verify git state is clean**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
rm -f .git/index.lock
git status 2>&1 | head -20
```

Expected: Git status shows the repository state without lock file errors.

---

## Task 3: Validate Environment Variables

**Files:**
- Reference: `.env` (local, not committed)
- Reference: Vercel dashboard environment variables (production)

- [ ] **Step 1: Verify all required env vars are present locally**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
cat .env | grep -E "TELEGRAM_BOT_TOKEN|TELEGRAM_SETUP_SECRET|TURSO_DATABASE_URL|TURSO_AUTH_TOKEN|ANTHROPIC_API_KEY"
```

Expected: Output showing all four variables are present with values (tokens should be partially masked in memory).

- [ ] **Step 2: Check Vercel environment variables in production**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel env ls --prod 2>&1 | head -20
```

Expected: Output showing all required environment variables are configured in Vercel production. If any are missing, note them.

- [ ] **Step 3: If missing, add TELEGRAM_BOT_TOKEN to Vercel**

If the previous step showed TELEGRAM_BOT_TOKEN is missing, run:

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel env add TELEGRAM_BOT_TOKEN production --value "7933883844:AAH5YnD-5p1BhDa-X7HnDTaY_TKGNHAMpI0" --yes 2>&1
```

Expected: Output confirming the environment variable was added.

- [ ] **Step 4: If missing, add TELEGRAM_SETUP_SECRET to Vercel**

If the previous step showed TELEGRAM_SETUP_SECRET is missing, run:

```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel env add TELEGRAM_SETUP_SECRET production --value "europa2026_bot_setup_secret" --yes 2>&1
```

Expected: Output confirming the environment variable was added.

- [ ] **Step 5: Verify TURSO credentials are present**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel env ls --prod 2>&1 | grep -i turso
```

Expected: Output shows both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are present.

---

## Task 4: Validate Next.js and Vercel Configuration

**Files:**
- Check: `next.config.mjs`
- Check: `vercel.json`
- Check: `tsconfig.json`
- Check: `package.json` (scripts section)

- [ ] **Step 1: Verify next.config.mjs has no syntax errors**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
node -c next.config.mjs 2>&1
```

Expected: No output (syntax is valid) or explicit error if there's a syntax problem.

- [ ] **Step 2: Verify vercel.json exists and is valid**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
if [ -f vercel.json ]; then
  cat vercel.json | jq . 2>&1 | head -20
else
  echo "✅ vercel.json not present (using defaults)"
fi
```

Expected: Either valid JSON output or confirmation that the file doesn't exist (which is fine, Vercel uses defaults).

- [ ] **Step 3: Check that build script in package.json is valid**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
cat package.json | jq '.scripts.build' 2>&1
```

Expected: Output showing `"next build"` or similar valid build command.

- [ ] **Step 4: Verify Node.js version compatibility**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
node --version
cat package.json | jq '.engines' 2>&1 || echo "No explicit engines specified"
```

Expected: Node version is v18 or higher (Vercel defaults to v18+). No explicit engines field or it specifies compatible version.

---

## Task 5: Force Fresh Build and Deploy to Vercel

**Files:**
- Modify: `.vercel/project.json` (created by Vercel, no manual changes needed)

- [ ] **Step 1: Remove .vercel directory to force fresh Vercel connection**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
rm -rf .vercel
echo "✅ Removed .vercel for fresh deployment"
```

Expected: Directory removed cleanly.

- [ ] **Step 2: Attempt production deployment with verbose output**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel --prod --yes 2>&1 | tee /tmp/vercel-deploy.log
```

Expected: Deployment begins. Wait for it to complete. Output will show either "Ready" or "Error".

- [ ] **Step 3: Check deployment status**

Run:
```bash
sleep 30
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
npx vercel list --prod 2>&1 | head -3
```

Expected: Most recent deployment status. If "Ready", deployment succeeded. If "Error", we need to investigate further.

- [ ] **Step 4: If deployment succeeded, verify the app loads**

Run:
```bash
# Get the production URL from the list
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
PROD_URL=$(npx vercel list --prod 2>&1 | grep "https://europa-2026" | head -1 | awk '{print $NF}')
echo "Testing production URL: $PROD_URL"
curl -s -I "$PROD_URL" | head -5
```

Expected: HTTP 200 or 307 redirect. If 502 or 503, the deployment is still initializing.

- [ ] **Step 5: Commit the successful state**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
git status
git add -A  # Only adds tracked files
git commit -m "build: successful vercel deployment after fixing build issues" 2>&1 || echo "Nothing to commit"
```

Expected: Either a successful commit or "nothing to commit" message.

---

## Task 6: Verify Telegram Bot PDF Support is Live

**Files:**
- Verify: `app/api/telegram/webhook/route.ts` (already contains the document handler)

- [ ] **Step 1: Confirm the production deployment has the PDF handler**

Run:
```bash
cd "/Users/tomas/Documents/EUROPA 2026/europa-2026"
grep -n "handleDocument" app/api/telegram/webhook/route.ts
```

Expected: Output showing the `handleDocument` function is present in the code (lines ~210-230).

- [ ] **Step 2: Test the bot with a PDF in Telegram**

Manual step:
1. Open Telegram
2. Send `/start` to @VibeTripper Bot
3. Provide your email: `tomasfernandezpico@gmail.com`
4. Send a PDF file (like your BOOKING_INVOICE.PDF.PDF)
5. Select "🧾 Ticket / gasto" when prompted
6. Verify the bot extracts the data and shows a preview

Expected: Bot processes the PDF without asking you to send it again. Data extraction shows amount, date, etc.

- [ ] **Step 3: Document successful test**

If the test passes, you're done. If it fails, note the exact error message and we can debug further.

---

## Success Criteria

- ✅ Vercel deployment shows "Ready" status (not "Error")
- ✅ Production URL (europa-2026-xxx.vercel.app) loads successfully
- ✅ Telegram bot successfully processes PDF files without re-requesting them
- ✅ All environment variables are present in Vercel production
- ✅ Local build cache is clean and doesn't interfere with future deployments

---

## If Deployment Still Fails

If after Task 5 the deployment is still showing "Error":
1. Check the deploy logs: `npx vercel logs <deployment-url> --prod`
2. Look for specific error messages (not just "Unexpected error")
3. Common causes:
   - Missing environment variables (Task 3 will catch this)
   - Out-of-memory during build (check Vercel dashboard for resource usage)
   - Incompatible dependency (check package-lock.json for version conflicts)
   - Function timeout (check if any serverless functions are taking too long)

Contact Vercel support with the deployment URL if errors persist beyond these steps.
