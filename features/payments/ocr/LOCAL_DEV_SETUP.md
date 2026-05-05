# Local Development Setup — GCash OCR Payment Verification

This guide walks through setting up the complete GCash OCR Payment Verification feature in your local development environment using Firebase Emulators and Supabase.

---

## Prerequisites

- Node.js 18+ and npm installed
- Firebase CLI installed globally: `npm install -g firebase-tools`
- Supabase CLI installed: `npm install -g supabase`
- Firebase project created and configured
- Google Cloud Vision API enabled in your GCP project

---

## Step 1: Install Dependencies

### Root Project

```bash
npm install
```

### Firebase Functions

```bash
cd functions
npm install
cd ..
```

---

## Step 2: Environment Variables

### Firebase Functions Environment

Create `functions/.env` (for local emulator):

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

Get the local service role key from Supabase local setup:

```bash
npx supabase status
# Look for "service_role key" in the output
```

### Next.js Environment

Create `.env.local` (if not already present):

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## Step 3: Start Supabase Local

```bash
npx supabase start
```

This will:

- Start local PostgreSQL database
- Apply all migrations (including OCR columns)
- Start Realtime server
- Start Storage service

**Verify migration applied:**

```bash
npx supabase db reset --debug
```

Check that `order_payments` table has these columns:

- `gcash_ref_no`
- `ocr_status`
- `ocr_raw_text`
- `ocr_confidence`
- `ocr_verified_at`

---

## Step 4: Start Firebase Emulators

### Initialize Firebase Emulators (first time only)

```bash
firebase init emulators
```

Select:

- ✅ Storage
- ✅ Functions

### Start Emulators

```bash
firebase emulators:start --import=./seed-data --export-on-exit
```

This will start:

- **Storage Emulator** — Port 9199
- **Functions Emulator** — Port 5001

**Verify Functions deployed:**

Open Emulator UI at http://localhost:4000 and check that `handlePaymentScreenshotUpload` appears under Functions.

---

## Step 5: Compile Firebase Functions

Before the emulator can run your functions, compile TypeScript:

```bash
cd functions
npm run build
cd ..
```

**Watch mode (for development):**

```bash
cd functions
npm run build:watch
```

This will automatically recompile when you edit Cloud Function code.

---

## Step 6: Seed Test Data

### Create Test Order Payment

1. Open Supabase local dashboard: http://localhost:54323
2. Navigate to **Table Editor** → `order_payments`
3. Insert a test row:

```sql
INSERT INTO order_payments (id, order_id, user_id, organization_id, amount, status, created_at)
VALUES (
  gen_random_uuid(),
  'test-order-123',
  'your-test-user-id',
  'your-test-org-id',
  1000.00,
  'pending',
  NOW()
);
```

### Prepare Test Images

Create `seed-data/test-images/` directory:

```bash
mkdir -p seed-data/test-images
```

Add test images:

- `valid-gcash-receipt.jpg` — Contains visible 13-digit Reference Number
- `invalid-receipt.jpg` — Missing Reference Number or unclear
- `blurry-receipt.jpg` — Poor quality image

---

## Step 7: Start Next.js Dev Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Step 8: Test the Complete Flow

### Upload Test Screenshot

1. Navigate to payment page (e.g., `/user/orders/test-order-123/payment`)
2. Use `PaymentVerificationFlow` component
3. Upload a test GCash receipt screenshot

### Monitor Logs

**Functions Emulator:**

```bash
# Terminal where `firebase emulators:start` is running
# Watch for [onPaymentScreenshotUploaded] logs
```

**Next.js Dev Server:**

```bash
# Terminal where `npm run dev` is running
# Watch for Realtime subscription logs
```

**Supabase Logs:**

```bash
npx supabase logs
```

### Verify Workflow

1. **Upload** → Screenshot appears in Firebase Storage Emulator
2. **Trigger** → Cloud Function logs show processing started
3. **OCR** → Vision API called (uses real API, not emulated)
4. **Database** → `order_payments` row updated with OCR result
5. **Realtime** → Next.js UI updates without page refresh

---

## Step 9: Debugging Tips

### Cloud Function Not Triggering

**Check:**

1. Storage path matches pattern: `payment-proofs/{userId}/{orderId}.ext`
2. Functions compiled: `cd functions && npm run build`
3. Emulator running: Check http://localhost:4000
4. Logs: Look for errors in emulator terminal

**Fix:**

```bash
# Restart emulators
firebase emulators:start --import=./seed-data --export-on-exit

# Rebuild functions
cd functions && npm run build && cd ..
```

### Vision API Fails in Local

**Issue:** Vision API is NOT emulated — uses real GCP API even locally.

**Solutions:**

1. **Preferred:** Enable Cloud Vision API in your GCP project (free tier available)
2. **Alternative:** Mock Vision API responses in development:

```typescript
// functions/src/payments/callVisionApi.ts
export async function callVisionApi(imageUrl: string): Promise<VisionResult> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Return mock data in emulator
    return {
      rawText: "Sample receipt text\n1234567890123\nAmount: ₱1,000",
      confidence: 0.95,
    };
  }
  // Real Vision API call
  // ...
}
```

### Supabase Connection Error

**Check:**

1. Supabase running: `npx supabase status`
2. Service role key correct in `functions/.env`
3. URL correct: `http://localhost:54321` (not https)

**Fix:**

```bash
# Restart Supabase
npx supabase stop
npx supabase start
```

### Realtime Not Working

**Check:**

1. Component has `'use client'` directive
2. Subscription filter matches `order_id`
3. Realtime enabled in Supabase (should be enabled by default)

**Test Realtime:**

```bash
# Open browser console
# Watch for Realtime connection logs
```

---

## Step 10: Hot Reload & Iteration

### Edit Cloud Function Code

1. Edit files in `functions/src/payments/`
2. Run `npm run build` in `functions/` directory
3. Firebase Emulator auto-reloads the function

**Watch mode (recommended):**

```bash
cd functions && npm run build:watch
```

### Edit Next.js Code

1. Edit files in `features/payments/ocr/`
2. Next.js Hot Module Replacement (HMR) auto-updates
3. No restart needed

### Edit Database Schema

1. Create new migration: `npx supabase migration new my_change`
2. Apply locally: `npx supabase db reset`
3. Restart app if needed

---

## Step 11: Test Scenarios

Run through each scenario to verify complete functionality:

### ✅ Success Scenario

1. Upload valid GCash receipt with clear 13-digit Reference Number
2. **Expected:** Payment status → `'verifying'` → `'confirmed'`
3. **Expected:** UI shows green success alert with Reference Number
4. **Expected:** OCR status = `'success'`

### ❌ No Reference Number

1. Upload image without GCash Reference Number
2. **Expected:** Payment status → `'verifying'` → `'rejected'`
3. **Expected:** UI shows red error: "No GCash Reference Number detected"
4. **Expected:** OCR status = `'no_ref_found'`

### ❌ Invalid Format

1. Upload receipt with < 13 or > 13 digit number
2. **Expected:** Payment status → `'rejected'`
3. **Expected:** UI shows "Invalid Reference Number format"
4. **Expected:** OCR status = `'invalid_format'`

### ❌ Duplicate Reference Number

1. Upload valid receipt with Reference Number `1234567890123`
2. Mark as `'confirmed'`
3. Create new test order, upload same receipt
4. **Expected:** New payment rejected as duplicate
5. **Expected:** UI shows "This Reference Number has already been used"
6. **Expected:** OCR status = `'duplicate_ref'`

### ⚠️ API Error

1. Disable network or Vision API
2. Upload receipt
3. **Expected:** Payment status → `'rejected'`
4. **Expected:** UI shows "Verification service temporarily unavailable"
5. **Expected:** OCR status = `'api_error'`

### 🔄 Re-upload Flow

1. Upload invalid receipt → rejected
2. Click "Replace" or use re-upload button
3. Upload valid receipt
4. **Expected:** Payment re-verified successfully
5. **Expected:** Previous OCR result overwritten

---

## Step 12: Performance Monitoring

### Measure OCR Processing Time

Add timing logs to Cloud Function:

```typescript
// functions/src/payments/onPaymentScreenshotUploaded.ts
const startTime = Date.now();

// ... OCR workflow ...

const duration = Date.now() - startTime;
console.log(`[Performance] Total OCR time: ${duration}ms`);
```

**Expected Times:**

- Vision API call: 2-5 seconds
- Duplicate check: < 100ms
- Database update: < 100ms
- **Total:** 3-10 seconds

### Monitor Realtime Latency

Check browser console for Realtime subscription logs:

```javascript
// Should update within 1-2 seconds of database write
```

---

## Step 13: Cleanup

### Stop Services

```bash
# Stop Firebase Emulators
Ctrl+C in emulator terminal

# Stop Supabase
npx supabase stop

# Stop Next.js
Ctrl+C in dev server terminal
```

### Export Emulator Data (Optional)

Emulator data auto-exports to `./seed-data` if `--export-on-exit` flag used.

To manually export:

```bash
firebase emulators:export ./seed-data
```

---

## Common Issues & Solutions

### Port Already in Use

**Error:** `Port 5001 is already in use`

**Fix:**

```bash
# Linux/Mac
lsof -ti:5001 | xargs kill -9

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process
```

### Build Errors in Functions

**Error:** TypeScript compilation fails

**Fix:**

```bash
cd functions
rm -rf lib/  # Clear previous build
npm run build
```

### Supabase Migration Conflicts

**Error:** Migration version conflicts

**Fix:**

```bash
npx supabase db reset --debug
# This drops and recreates the database from migrations
```

---

## Production Deployment

Once local testing is complete, deploy to production:

### 1. Deploy Firebase Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. Apply Supabase Migration

```bash
npx supabase db push
```

### 3. Set Production Environment Variables

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.service_role_key="your-production-service-role-key"

# Deploy config
firebase deploy --only functions
```

### 4. Verify Production

Test with real GCash receipt in production environment.

---

## Next Steps

- [ ] Review [README.md](./README.md) for complete feature documentation
- [ ] Test all error scenarios locally
- [ ] Review Cloud Function logs for debugging
- [ ] Set up monitoring and alerts for production
- [ ] Configure rate limiting for Vision API
- [ ] Add analytics tracking for OCR success rates

---

**Last Updated:** 2026-05-06
**Version:** 1.0.0
