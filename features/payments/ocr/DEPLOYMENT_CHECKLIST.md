# Production Deployment Checklist — GCash OCR Payment Verification

Complete pre-deployment verification checklist before releasing to production.

---

## ✅ Code Quality

- [x] **No TypeScript Errors:** All files compile without errors
- [x] **No `any` Types:** Strict TypeScript enforced throughout
- [x] **ESLint Passes:** Zero warnings in both root and `functions/`
- [x] **Build Succeeds:** Both Next.js and Functions build without errors
- [x] **Explicit Return Types:** All functions have explicit return types
- [x] **Error Handling:** All async operations wrapped in try/catch
- [x] **No Console Logs:** Production code uses proper logging (Cloud Functions logger)

**Verification Commands:**

```bash
# Root project
npm run lint
npm run build

# Functions
cd functions
npm run lint
npm run build
cd ..
```

---

## ✅ Security

### Firebase Security

- [ ] **Storage Rules:** Only authenticated users can upload to `payment-proofs/{userId}/`
- [ ] **Service Role Key:** Not exposed in client code
- [ ] **Environment Variables:** All secrets stored in Firebase Functions config (not in code)
- [ ] **CORS Configuration:** Storage bucket allows only your domain

**Verify Storage Rules:**

```javascript
// firebase.storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /payment-proofs/{userId}/{orderId}.{ext} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
  }
}
```

**Set Environment Variables:**

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.service_role_key="your-service-role-key"
```

**Verify Configuration:**

```bash
firebase functions:config:get
```

### Supabase Security

- [x] **RLS Enabled:** Row Level Security active on `order_payments` table
- [ ] **Service Role Bypass:** Cloud Function uses service role key correctly
- [ ] **Client Uses Anon Key:** Next.js components use public anon key only
- [ ] **RLS Policies:** Users can only read their own payments

**Verify RLS Policies:**

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'order_payments';
-- rowsecurity should be TRUE

-- List policies
SELECT * FROM pg_policies WHERE tablename = 'order_payments';
```

### Data Privacy

- [x] **PII Protection:** No sensitive data logged in Cloud Function
- [x] **OCR Raw Text:** Stored for audit, accessible only to admins
- [x] **Reference Numbers:** Treated as sensitive, not exposed in public APIs
- [x] **Signed URLs:** Firebase Storage uses expired signed URLs (15 min for Cloud Function)

---

## ✅ Database

### Schema Verification

- [x] **Migration Applied:** OCR columns exist in `order_payments` table
- [x] **Unique Index:** `idx_order_payments_gcash_ref_no_unique` exists
- [x] **Lookup Index:** `idx_order_payments_gcash_ref_no` exists
- [x] **Enum Values:** `payment_status` enum includes `'verifying'`
- [ ] **Schema Reload:** Run `NOTIFY pgrst, 'reload schema'` after migration

**Apply Migration:**

```bash
npx supabase db push
```

**Verify Columns:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_payments'
  AND column_name IN ('gcash_ref_no', 'ocr_status', 'ocr_raw_text', 'ocr_confidence', 'ocr_verified_at');
```

**Verify Indexes:**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'order_payments'
  AND indexname LIKE '%gcash_ref_no%';
```

**Reload Schema Cache:**

```sql
NOTIFY pgrst, 'reload schema';
```

### Duplicate Prevention

- [x] **Application Layer:** Cloud Function checks duplicates before writing
- [x] **Database Layer:** Unique index on `gcash_ref_no` prevents hard duplicates
- [ ] **Test Duplicate:** Verify duplicate Reference Number is rejected

**Test Query:**

```sql
-- This should fail if duplicate Reference Number exists
INSERT INTO order_payments (order_id, gcash_ref_no, status)
VALUES ('test-id', '1234567890123', 'confirmed');

-- Try to insert duplicate (should fail)
INSERT INTO order_payments (order_id, gcash_ref_no, status)
VALUES ('test-id-2', '1234567890123', 'confirmed');
-- Expected: ERROR: duplicate key value violates unique constraint
```

---

## ✅ Google Cloud Platform

### Vision API Setup

- [ ] **API Enabled:** Cloud Vision API enabled in GCP Console
- [ ] **Billing Enabled:** GCP project has active billing account
- [ ] **Quota Limits:** Vision API quota sufficient for expected load
- [ ] **Service Account:** Firebase service account has Vision API permissions
- [ ] **ADC Configured:** Application Default Credentials used (no API key needed)

**Verify Vision API Enabled:**

1. Open GCP Console: https://console.cloud.google.com
2. Navigate to **APIs & Services → Enabled APIs**
3. Confirm **Cloud Vision API** is listed
4. Check quota: **APIs & Services → Quotas**

**Expected Quota:**

- **Free Tier:** 1,000 units/month
- **Paid:** Adjust based on expected traffic

### Cost Estimation

**Vision API Pricing (2026):**

- First 1,000 units/month: FREE
- Next 999,000 units: $1.50 per 1,000 units
- Over 1,000,000 units: $0.60 per 1,000 units

**Expected Monthly Costs:**

- 100 orders/day × 30 days = 3,000 requests/month
- First 1,000 free, remaining 2,000 × $1.50 ÷ 1,000 = **$3.00/month**

---

## ✅ Firebase Deployment

### Functions Deployment

- [ ] **Build Succeeds:** `npm run build` in `functions/` directory
- [ ] **Deploy Succeeds:** `firebase deploy --only functions`
- [ ] **Function Listed:** `handlePaymentScreenshotUpload` appears in Firebase Console
- [ ] **Trigger Configured:** Storage trigger on `payment-proofs/` path
- [ ] **Environment Variables Set:** Supabase URL and service role key configured

**Deploy Commands:**

```bash
# Build functions
cd functions
npm run build

# Deploy to Firebase
firebase deploy --only functions:handlePaymentScreenshotUpload

# Verify deployment
firebase functions:list
```

**Check Firebase Console:**

1. Open Firebase Console
2. Navigate to **Functions**
3. Confirm `handlePaymentScreenshotUpload` is listed
4. Check trigger: Should be **Storage → onObjectFinalized**

### Storage Configuration

- [ ] **Bucket Exists:** Default Firebase Storage bucket configured
- [ ] **CORS Configured:** Allows uploads from your domain
- [ ] **Security Rules:** Deployed and active
- [ ] **Path Pattern:** Matches `payment-proofs/{userId}/{orderId}.{ext}`

**Deploy Storage Rules:**

```bash
firebase deploy --only storage
```

---

## ✅ Next.js Integration

### Component Integration

- [x] **Components Exported:** All components in barrel export (`features/payments/ocr/index.ts`)
- [x] **Hooks Exported:** All hooks available for import
- [x] **Types Exported:** TypeScript types available
- [ ] **Page Integration:** `PaymentVerificationFlow` integrated in payment page
- [ ] **Route Exists:** Payment page accessible at `/user/orders/[orderId]/payment`

**Verify Exports:**

```typescript
// Should work without errors
import {
  PaymentVerificationFlow,
  PaymentUploadForm,
  PaymentVerificationStatus,
  usePaymentVerification,
  usePaymentSubmit,
  type OcrStatus,
} from "@/features/payments/ocr";
```

### Realtime Configuration

- [ ] **Supabase Realtime Enabled:** Check Supabase Dashboard → Project Settings → Realtime
- [ ] **Table Enabled:** `order_payments` table enabled for Realtime
- [ ] **Client Configured:** Browser client uses correct Supabase URL and anon key
- [ ] **Subscription Works:** Test that UI updates without page refresh

**Enable Realtime (if not already):**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE order_payments;
```

---

## ✅ Error Handling

### Client-Side Errors

- [x] **Upload Errors:** File size/type validation before upload
- [x] **Network Errors:** Retry functionality on upload failure
- [x] **Auth Errors:** User redirected to login if unauthenticated
- [x] **Realtime Errors:** Graceful handling of subscription failures

### Server-Side Errors

- [x] **Vision API Errors:** Caught and logged, payment marked as `'rejected'`
- [x] **Supabase Errors:** Caught and logged, payment status updated
- [x] **Storage Errors:** Handled in Cloud Function, logged for debugging
- [x] **Duplicate Errors:** Caught by unique index, clear error message shown

**Test Error Scenarios:**

1. Upload file > 5MB → Client validation error
2. Upload invalid image type → Client validation error
3. Network offline → Upload retry button shown
4. Vision API down → Payment rejected with `'api_error'` status
5. Duplicate Reference Number → Payment rejected with `'duplicate_ref'` status

---

## ✅ Performance

### Response Times

**Expected Metrics:**

- Upload to Storage: 1-3 seconds
- Cloud Function execution: 5-15 seconds
- Vision API latency: 2-5 seconds
- Database write: < 500ms
- Realtime propagation: < 1 second
- **Total:** 10-30 seconds end-to-end

**Test Performance:**

```bash
# Monitor Cloud Function logs
firebase functions:log --only handlePaymentScreenshotUpload

# Look for timing logs:
# [Performance] Total OCR time: XXXXms
```

### Cold Start Optimization

**Considerations:**

- Firebase Functions can have cold starts (0-5 seconds)
- Vision API first call may be slower
- Warm functions typically execute in < 10 seconds

**Optimization (Optional):**

```bash
# Increase function memory (faster execution)
# In functions/src/payments/index.ts
export const handlePaymentScreenshotUpload = onObjectFinalized({
  memory: "512MiB", // Default is 256MiB
  timeoutSeconds: 120, // Default is 60s
}, async (event) => {
  // ...
});
```

---

## ✅ Monitoring & Logging

### Firebase Logs

- [ ] **Function Logs:** Accessible in Firebase Console → Functions → Logs
- [ ] **Error Alerting:** Set up alerts for function failures
- [ ] **Quota Monitoring:** Monitor Vision API quota usage

**View Logs:**

```bash
# Realtime logs
firebase functions:log

# Filter by function
firebase functions:log --only handlePaymentScreenshotUpload
```

**Set Up Alerts (Firebase Console):**

1. Navigate to **Functions → Alerts**
2. Create alert for error rate threshold
3. Configure notification email/Slack webhook

### Supabase Logs

- [ ] **Database Logs:** Available in Supabase Dashboard → Logs
- [ ] **RLS Policy Violations:** Monitor for unauthorized access attempts
- [ ] **Query Performance:** Check for slow queries on `order_payments` table

**Check Logs:**

```bash
# Via CLI
npx supabase inspect db calls

# Via Dashboard
# Supabase Dashboard → Logs → Postgres Logs
```

### Application Monitoring

- [ ] **OCR Success Rate:** Track percentage of successful verifications
- [ ] **Common Failure Reasons:** Which `ocr_status` values are most common
- [ ] **Average Processing Time:** Monitor Cloud Function execution duration
- [ ] **Duplicate Detection Rate:** How often duplicates are caught

**Analytics Query (Supabase SQL Editor):**

```sql
-- OCR success rate (last 30 days)
SELECT
  ocr_status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM order_payments
WHERE ocr_verified_at >= NOW() - INTERVAL '30 days'
GROUP BY ocr_status
ORDER BY count DESC;
```

---

## ✅ Testing

### Manual Testing

- [ ] **Valid Receipt:** Upload clear GCash receipt → Auto-approved
- [ ] **Invalid Receipt:** Upload image without Reference Number → Rejected
- [ ] **Duplicate:** Submit same Reference Number twice → Second rejected
- [ ] **Blurry Image:** Upload low-quality image → Graceful failure
- [ ] **Re-upload:** Replace rejected screenshot → Works correctly
- [ ] **Realtime:** UI updates without page refresh

### Automated Testing (Optional)

**Unit Tests:**

```bash
# Functions
cd functions
npm test

# Next.js
npm test
```

**Integration Tests:**

Mock Firebase Storage upload and Vision API responses to test complete flow.

---

## ✅ Documentation

- [x] **README.md:** Complete feature documentation created
- [x] **LOCAL_DEV_SETUP.md:** Local development guide created
- [x] **DEPLOYMENT_CHECKLIST.md:** This checklist created
- [ ] **Team Training:** Walkthrough with team members
- [ ] **Support Documentation:** Customer support guide for handling OCR issues

---

## ✅ Rollback Plan

### If Issues Arise in Production

**Immediate Actions:**

1. **Pause Cloud Function:**

   ```bash
   firebase functions:delete handlePaymentScreenshotUpload
   ```

2. **Revert to Manual Verification:**
   - Payment proofs still visible to admins in Storage
   - Admins can manually approve/reject payments

3. **Rollback Migration (if needed):**

   ```sql
   ALTER TABLE order_payments
   DROP COLUMN IF EXISTS gcash_ref_no,
   DROP COLUMN IF EXISTS ocr_status,
   DROP COLUMN IF EXISTS ocr_raw_text,
   DROP COLUMN IF EXISTS ocr_confidence,
   DROP COLUMN IF EXISTS ocr_verified_at;
   ```

4. **Notify Users:**
   - Display message: "Automated verification temporarily unavailable. Manual review in progress."

---

## 🚀 Final Go/No-Go Decision

**All items checked?** → ✅ **READY FOR PRODUCTION**

**Any items unchecked?** → ⚠️ **RESOLVE BEFORE DEPLOYMENT**

**Critical blockers:**

- Security vulnerabilities
- Database migration failures
- Vision API not enabled
- Cloud Function compilation errors
- RLS policies incorrect

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor Cloud Function logs every 2 hours
- [ ] Check Supabase logs for errors
- [ ] Verify Realtime updates working
- [ ] Track OCR success rate
- [ ] Monitor Vision API quota usage

### First Week

- [ ] Review OCR failure patterns
- [ ] Analyze common rejection reasons
- [ ] Gather user feedback
- [ ] Optimize Vision API confidence thresholds
- [ ] Fine-tune error messages based on user confusion

### First Month

- [ ] Generate OCR analytics report
- [ ] Calculate cost vs. benefit (time saved, manual work reduced)
- [ ] Plan improvements based on data
- [ ] Consider adding manual review queue for edge cases

---

## Support Procedures

### User Reports "Payment Not Verified"

1. **Check Cloud Function Logs:**

   ```bash
   firebase functions:log --only handlePaymentScreenshotUpload
   ```

2. **Check Supabase Row:**

   ```sql
   SELECT * FROM order_payments WHERE order_id = 'affected-order-id';
   ```

3. **Review `ocr_status` and `ocr_raw_text`:**
   - `no_ref_found` → Ask for clearer screenshot
   - `invalid_format` → Manual review (may be false negative)
   - `duplicate_ref` → Investigate if legitimately duplicate or error
   - `api_error` → Check Vision API status, retry if transient

4. **Manual Override (if needed):**
   ```sql
   UPDATE order_payments
   SET status = 'confirmed',
       gcash_ref_no = 'manually-verified-ref-no',
       ocr_status = 'manual_override'
   WHERE order_id = 'affected-order-id';
   ```

---

## Conclusion

This checklist ensures the GCash OCR Payment Verification feature is secure, performant, and ready for production deployment. Complete all items before going live.

**Questions or issues?**

- Review [README.md](./README.md) for technical details
- Review [LOCAL_DEV_SETUP.md](./LOCAL_DEV_SETUP.md) for testing procedures
- Contact engineering team for support

---

**Deployment Date:** ******\_\_\_******
**Deployed By:** ******\_\_\_******
**Sign-off:** ******\_\_\_******

---

**Last Updated:** 2026-05-06
**Version:** 1.0.0
