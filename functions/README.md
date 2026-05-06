# Verch Firebase Cloud Functions

Firebase Cloud Functions for automated payment verification and backend workflows.

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

**For local development:**

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

**For production deployment:**

Firebase Functions v2 uses environment variables and secrets:

```bash
# Store service role key as encrypted secret (recommended)
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY

# Set Supabase URL as environment variable
firebase functions:config:set env.supabase_url="https://your-project.supabase.co" --force
```

Or define in `firebase.json`:

```json
{
  "functions": [
    {
      "source": "functions",
      "runtime": "nodejs20",
      "environmentVariables": {
        "SUPABASE_URL": "https://your-project.supabase.co"
      }
    }
  ]
}
```

See [Firebase Secrets Manager docs](https://firebase.google.com/docs/functions/config-env) for details.

### 3. Enable Google Cloud Vision API

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services → Library**
4. Search for **Cloud Vision API**
5. Click **Enable**

**No API key required** — Firebase Cloud Functions automatically use Application Default Credentials (ADC) when deployed.

### 4. Build

```bash
npm run build
```

### 5. Deploy

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:handlePaymentScreenshotUpload
```

### 6. Pre-Deployment Checklist

**Before deploying to production, verify:**

1. **Environment Variables in `firebase.json`:**
   - `SUPABASE_URL` set to production URL (e.g., `https://wfyssjznhrgevviyfqgj.supabase.co`)
   - **NOT** `http://127.0.0.1:54321` (local development URL)

2. **Firebase Secrets Manager:**
   - `SUPABASE_SERVICE_ROLE_KEY` set via `firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY`
   - Verify with: `firebase functions:secrets:access SUPABASE_SERVICE_ROLE_KEY`

3. **`.gcloudignore` File:**
   - Exists in `functions/` directory
   - Contains `.env` to prevent local config from being deployed
   - Cloud Functions will use `firebase.json` environment variables instead

4. **Cloud Vision API Enabled:**
   - Verify in GCP Console that Cloud Vision API is enabled for your project

5. **Build Succeeds:**
   - Run `npm run build` and verify no TypeScript errors

**Common Deployment Issues:**

- **ECONNREFUSED 127.0.0.1:54321**: Local `.env` was deployed. Add `.env` to `.gcloudignore` and redeploy.
- **Missing SUPABASE_SERVICE_ROLE_KEY**: Set via Firebase Secrets Manager, not environment variables.
- **Vision API 403 Error**: Cloud Vision API not enabled in GCP Console.

## Local Development

### Run with Firebase Emulator

```bash
npm run serve
```

Access emulator UI at http://localhost:4000

### Test Function Locally

```bash
npm run shell
```

## Functions

### `handlePaymentScreenshotUpload`

**Trigger:** Firebase Storage `onObjectFinalized` event
**Purpose:** Automated GCash payment screenshot verification via OCR

**Flow:**

1. User uploads payment screenshot to Firebase Storage
2. Function triggers automatically
3. Calls Google Cloud Vision API for text detection
4. Extracts and validates 13-digit GCash Reference Number
5. Checks for duplicates in Supabase
6. Updates payment row with OCR result
7. Sets payment status to `confirmed` (pass) or `rejected` (fail)

**Storage Path Pattern:**

```
payment-proofs/{userId}/{orderId}.{ext}
```

## Project Structure

```
functions/
├── src/
│   ├── payments/
│   │   ├── index.ts                        # Payment functions export
│   │   ├── types.ts                        # Shared types
│   │   ├── onPaymentScreenshotUploaded.ts  # Main trigger handler
│   │   ├── callVisionApi.ts                # Vision API wrapper
│   │   └── extractRefNo.ts                 # Ref Number extraction
│   └── index.ts                            # Main entry point
├── lib/                                    # Compiled JavaScript (git-ignored)
├── package.json
├── tsconfig.json
└── .eslintrc.json
```

## TypeScript

Strict mode enabled. All functions must have explicit return types. No `any` types allowed.

## Linting

```bash
npm run lint
```

ESLint configured with `@typescript-eslint/no-explicit-any: error`.
