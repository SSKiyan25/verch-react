# GCash OCR Payment Verification

Automated GCash payment screenshot verification using Google Cloud Vision API and Firebase Cloud Functions.

## Overview

This feature provides end-to-end automated payment verification:

1. **Buyer uploads** GCash payment screenshot
2. **Cloud Function** automatically triggers on upload
3. **Vision API** extracts text from image
4. **Validation** checks Reference Number format and duplicates
5. **Real-time UI** updates via Supabase Realtime
6. **Auto-approval** if verification succeeds, rejection if it fails

**Tech Stack:**

- Frontend: Next.js 16 (App Router) + Supabase Realtime
- Backend: Firebase Cloud Functions + Google Cloud Vision API
- Database: Supabase PostgreSQL with RLS

## Architecture Flow

```
Buyer uploads screenshot
        ↓
Firebase Storage (image stored)
        ↓
Cloud Function triggers (onObjectFinalized)
        ↓
Google Cloud Vision API (OCR)
        ↓
Extract & validate 13-digit Reference Number
        ↓
Check for duplicates (Supabase)
        ↓
Update payment status (confirmed/rejected)
        ↓
Next.js client updates via Realtime
        ↓
✅ Auto-approved OR ❌ Auto-rejected
```

## Components

### `PaymentVerificationFlow` (Recommended)

Complete integration component combining upload and status display.

```tsx
import { PaymentVerificationFlow } from "@/features/payments/ocr";

<PaymentVerificationFlow
  orderId="order-123"
  onPaymentConfirmed={(refNo) => {
    console.log("Payment confirmed:", refNo);
    router.push("/success");
  }}
/>;
```

**Features:**

- Upload form with drag-and-drop
- Real-time verification status
- Automatic re-upload on rejection
- Helpful tips after failed attempts
- Support contact after 3 failed attempts

---

### `PaymentUploadForm`

File upload component with validation and preview.

```tsx
import { PaymentUploadForm } from "@/features/payments/ocr";

<PaymentUploadForm
  orderId="order-123"
  onUploadComplete={(path, url) => {
    console.log("Upload complete:", path);
  }}
  disabled={false}
/>;
```

**Features:**

- Drag-and-drop support
- File type validation (JPEG, PNG, WebP)
- File size validation (max 5MB)
- Image preview before upload
- Loading states with spinner
- Error handling with retry button
- Replace/re-upload functionality

---

### `PaymentVerificationStatus`

Real-time verification status display with Supabase Realtime.

```tsx
import { PaymentVerificationStatus } from "@/features/payments/ocr";

<PaymentVerificationStatus
  orderId="order-123"
  onVerified={(refNo) => console.log("Verified:", refNo)}
  onRejected={(reason) => console.log("Rejected:", reason)}
/>;
```

**Status States:**

- **Pending** (gray) — Waiting for upload
- **Verifying** (blue) — OCR in progress
- **Confirmed** (green) — Payment verified with Reference Number
- **Rejected** (red) — Verification failed with reason

**Error Messages:**

- `no_ref_found` — No Reference Number detected
- `invalid_format` — Invalid format (not 13 digits)
- `duplicate_ref` — Reference Number already used
- `api_error` — Vision API temporarily unavailable

---

## Hooks

### `usePaymentSubmit()`

Handles file upload to Firebase Storage.

```tsx
import { usePaymentSubmit } from "@/features/payments/ocr";

const {
  uploadPaymentProof,
  resetUpload,
  isUploading,
  error,
  uploadedPath,
  uploadedUrl,
} = usePaymentSubmit();

const handleUpload = async () => {
  const result = await uploadPaymentProof(orderId, file);
  if (result.success) {
    console.log("Upload successful:", result.path);
  } else {
    console.error("Upload failed:", result.error);
  }
};
```

**Returns:**

- `uploadPaymentProof(orderId, file)` — Upload function
- `resetUpload()` — Clear upload state
- `isUploading` — Loading state
- `error` — Error message (if any)
- `uploadedPath` — Firebase Storage path
- `uploadedUrl` — Signed download URL

---

### `usePaymentVerification()`

Subscribes to real-time payment status updates.

```tsx
import { usePaymentVerification } from "@/features/payments/ocr";

const {
  paymentStatus,
  ocrStatus,
  gcashRefNo,
  ocrConfidence,
  ocrVerifiedAt,
  loading,
  error,
} = usePaymentVerification(orderId);
```

**Returns:**

- `paymentStatus` — Current payment status (pending, verifying, confirmed, rejected)
- `ocrStatus` — OCR result (success, no_ref_found, invalid_format, duplicate_ref, api_error)
- `gcashRefNo` — Extracted 13-digit Reference Number
- `ocrConfidence` — Vision API confidence score (0-1)
- `ocrVerifiedAt` — Timestamp when OCR completed
- `loading` — Initial fetch loading state
- `error` — Error message (if any)

**Real-time Updates:**

- Automatically subscribes to Supabase Realtime
- Updates state when payment row changes
- Unsubscribes on component unmount

---

## Types

```typescript
export type OcrStatus =
  | "success"
  | "no_ref_found"
  | "invalid_format"
  | "duplicate_ref"
  | "api_error";

export interface PaymentVerificationState {
  paymentStatus: PaymentStatus;
  ocrStatus: OcrStatus | null;
  gcashRefNo: string | null;
  ocrConfidence: number | null;
  ocrVerifiedAt: string | null;
  loading: boolean;
  error: string | null;
}
```

---

## Database Schema

### `order_payments` Table

| Column            | Type         | Description                                       |
| ----------------- | ------------ | ------------------------------------------------- |
| `gcash_ref_no`    | TEXT         | Extracted 13-digit GCash Reference Number         |
| `ocr_status`      | TEXT         | OCR result (success, no_ref_found, etc.)          |
| `ocr_raw_text`    | TEXT         | Full text extracted by Vision API (for debugging) |
| `ocr_confidence`  | NUMERIC(3,2) | Vision API confidence score (0.00 - 1.00)         |
| `ocr_verified_at` | TIMESTAMPTZ  | Timestamp when OCR processing completed           |

**Indexes:**

- `idx_order_payments_gcash_ref_no_unique` — Unique index on `gcash_ref_no` (prevents duplicates)
- `idx_order_payments_gcash_ref_no` — Lookup index for fast duplicate checks

**Payment Status Enum:**

- `pending` — Awaiting screenshot upload
- `proof_submitted` — Screenshot uploaded, waiting for verification
- `verifying` — OCR processing in progress
- `confirmed` — Payment verified successfully
- `rejected` — Verification failed

---

## Cloud Function

### `handlePaymentScreenshotUpload`

Firebase Cloud Function triggered on Storage upload.

**Trigger:** `onObjectFinalized` (Firebase Storage)
**Path Pattern:** `payment-proofs/{userId}/{orderId}.{extension}`

**Workflow:**

1. Extract `userId` and `orderId` from Storage path
2. Update payment status to `'verifying'`
3. Generate signed URL for Vision API
4. Call Vision API to extract text
5. Extract and validate 13-digit Reference Number
6. Check for duplicate Reference Numbers in database
7. Update payment with OCR result:
   - **Success** → `status: 'confirmed'`, `ocr_status: 'success'`
   - **Failure** → `status: 'rejected'`, `ocr_status: 'no_ref_found'|'invalid_format'|'duplicate_ref'`
8. Handle errors → `status: 'rejected'`, `ocr_status: 'api_error'`

**Environment Variables:**

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Deployment:**

```bash
cd functions
npm run build
firebase deploy --only functions:handlePaymentScreenshotUpload
```

---

## Security

### RLS Policies

- Cloud Function uses **service role key** to bypass RLS
- Client uses **public anon key** with RLS enforced
- Only authenticated users can upload to Firebase Storage
- Payment rows filtered by user ownership in RLS policies

### Duplicate Prevention

**Two-layer protection:**

1. **Application layer** — Cloud Function checks for duplicates before writing
2. **Database layer** — Unique index on `gcash_ref_no` prevents hard duplicates

### Data Privacy

- OCR raw text stored for debugging and audit (admin-only access)
- Reference Numbers are treated as sensitive data
- No PII logged in Cloud Function logs

---

## Error Handling

### Upload Errors

- **File too large** → Client validation before upload
- **Invalid file type** → Client validation before upload
- **Network error** → Retry button shown
- **Firebase Auth error** → User redirected to login

### OCR Errors

- **Vision API down** → `ocr_status: 'api_error'`, payment rejected
- **No Reference Number found** → User-friendly message with tips
- **Invalid format** → Clear explanation of required format
- **Duplicate Reference Number** → Warning message, contact support

### Re-upload Flow

1. Payment rejected with clear error message
2. Helpful tips shown (e.g., "Ensure Reference Number is visible")
3. User can replace screenshot immediately
4. After 3 failed attempts, support contact suggested

---

## Testing

### Local Development

1. **Firebase Emulator:**

   ```bash
   firebase emulators:start
   ```

2. **Test Images:**
   - Valid GCash receipt with 13-digit Reference Number
   - Invalid receipt (missing Reference Number)
   - Blurry/corrupted image

3. **Supabase Local:**
   ```bash
   npx supabase start
   ```

### Test Scenarios

- [ ] Upload valid receipt → Auto-approved within 10-30 seconds
- [ ] Upload invalid format → Rejected with "Invalid format" message
- [ ] Submit duplicate Reference Number → Rejected with "Duplicate" message
- [ ] Upload very large image (>5MB) → Validation error before upload
- [ ] Unreliable network → Retry functionality works
- [ ] Real-time updates → UI updates without page refresh

### Manual Testing Checklist

```bash
# 1. Deploy Cloud Function
cd functions && firebase deploy --only functions

# 2. Upload test screenshot
# Use PaymentVerificationFlow component in Next.js app

# 3. Check Cloud Function logs
firebase functions:log

# 4. Verify Supabase row updated
# Check order_payments table in Supabase Dashboard

# 5. Confirm Realtime updates
# Watch UI update without page refresh
```

---

## Troubleshooting

### Cloud Function Not Triggering

**Check:**

1. Firebase Storage bucket name matches project
2. Storage path pattern correct: `payment-proofs/{userId}/{orderId}.ext`
3. Cloud Function deployed: `firebase deploy --only functions`
4. Check logs: `firebase functions:log`

### Vision API Error

**Check:**

1. Cloud Vision API enabled in GCP Console
2. Service account has Vision API permissions
3. Firebase project has billing enabled
4. Check quota limits in GCP Console

### Supabase Connection Error

**Check:**

1. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in Functions config
2. Service role key has correct permissions
3. RLS policies allow Cloud Function writes
4. Check Supabase logs for connection errors

### Realtime Not Updating UI

**Check:**

1. Supabase Realtime enabled for `order_payments` table
2. Component is using `'use client'` directive
3. Subscription filter matches order_id
4. Check browser console for subscription errors

### Duplicate Reference Numbers Not Blocked

**Check:**

1. Unique index exists: `idx_order_payments_gcash_ref_no_unique`
2. Cloud Function duplicate check logic working
3. Service role key bypassing RLS correctly
4. Check database logs for constraint violations

---

## Performance

### Vision API Response Time

- **Average:** 2-5 seconds for standard receipt images
- **Max:** 10 seconds for large/complex images
- **Timeout:** 60 seconds (Cloud Function timeout)

### Storage Upload Time

- **Average:** 1-3 seconds for typical receipt screenshots (< 2MB)
- **Max:** 10 seconds for 5MB images

### Total Verification Time

**End-to-end:** 10-30 seconds from upload to UI update

**Breakdown:**

1. Upload to Storage: 1-3 seconds
2. Cloud Function cold start: 0-5 seconds (if cold)
3. Vision API OCR: 2-5 seconds
4. Database write: <1 second
5. Realtime propagation: <1 second

---

## Future Enhancements

- [ ] **Multi-language OCR** — Support receipts in different languages
- [ ] **Confidence threshold** — Require minimum confidence score
- [ ] **Manual review queue** — Admin can review low-confidence results
- [ ] **Receipt templates** — Pre-fill amount/date if detected
- [ ] **Batch processing** — Support multiple receipts per order
- [ ] **Webhook notifications** — Notify external systems on verification
- [ ] **Analytics dashboard** — Track OCR success rates and common failure reasons

---

## Support

**Issues:**

- GitHub: [verch-react/issues](https://github.com/your-org/verch-react/issues)
- Email: dev@verch.ph

**Documentation:**

- Firebase Functions: https://firebase.google.com/docs/functions
- Cloud Vision API: https://cloud.google.com/vision/docs
- Supabase Realtime: https://supabase.com/docs/guides/realtime

---

**Last Updated:** 2026-05-06
**Version:** 1.0.0
