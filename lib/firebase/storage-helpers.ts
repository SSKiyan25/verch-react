import { storage } from "@/lib/firebase/firebase-admin";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const SIGNED_URL_EXPIRY = {
  PAYMENT_PROOF: 15, // minutes — short, sensitive financial screenshot
  INVOICE: 60, // minutes — longer, customer may print or share
} as const;

const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UploadResult =
  | { success: true; path: string }
  | { success: false; error: string };

export interface InvoiceUploadParams {
  orgId: string;
  invoiceYear: string | number;
  invoiceNumber: string; // e.g. "INV-2026-00001"
  pdfBuffer: Buffer;
}

export interface PaymentProofUploadParams {
  userId: string;
  orderId: string;
  file: File;
}

// ─────────────────────────────────────────────
// Signed URL
// ─────────────────────────────────────────────

/**
 * Generates a temporary signed URL for a private Firebase Storage file.
 * Use this in Server Actions or API routes after verifying Supabase auth + role.
 * Never store the returned URL in the DB — it expires.
 * Store the path instead and call this at render time.
 */
export async function getSignedDownloadUrl(
  filePath: string,
  expiresInMinutes: number = SIGNED_URL_EXPIRY.PAYMENT_PROOF,
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  const expires = Date.now() + expiresInMinutes * 60 * 1000;

  const [url] = await file.getSignedUrl({
    action: "read",
    expires,
  });

  return url;
}

// ─────────────────────────────────────────────
// Payment Proof
// ─────────────────────────────────────────────

/**
 * Validates and uploads a GCash payment proof screenshot to Firebase Storage.
 * Path pattern: payment-proofs/{userId}/{orderId}.{ext}
 *
 * Call this from the submit_payment_proof Server Action AFTER:
 *   1. Supabase auth.getUser() — confirm identity
 *   2. Verifying the order belongs to the user
 *   3. Verifying order_payments.method = 'gcash'
 *   4. Verifying order_payments.status IN ('pending', 'rejected')
 *
 * If the customer is re-uploading (status = 'rejected'), call
 * deleteStorageFile(existingPath) before this to clean up the old file.
 */
export async function uploadPaymentProof({
  userId,
  orderId,
  file,
}: PaymentProofUploadParams): Promise<UploadResult> {
  console.log("[uploadPaymentProof] file size:", file.size);
  console.log("[uploadPaymentProof] file type:", file.type);
  console.log(
    `[uploadPaymentProof] Starting upload for userId=${userId}, orderId=${orderId}, fileName=${file.name}, fileType=${file.type}, fileSize=${file.size} bytes`,
  );
  // Validate file type
  if (
    !ALLOWED_PROOF_TYPES.includes(
      file.type as (typeof ALLOWED_PROOF_TYPES)[number],
    )
  ) {
    return {
      success: false,
      error: "File must be an image (JPG, PNG, WEBP)",
    };
  }

  // Validate file size
  if (file.size > MAX_PROOF_SIZE_BYTES) {
    return {
      success: false,
      error: "File size must be under 10MB",
    };
  }

  try {
    const extension = file.name.split(".").pop();
    const filePath = `payment-proofs/${userId}/${orderId}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          orderId,
        },
      },
    });

    return { success: true, path: filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Upload failed: ${message}` }; // real error in UI
  }
}

// ─────────────────────────────────────────────
// Invoice PDF
// ─────────────────────────────────────────────

/**
 * Uploads a generated invoice PDF to Firebase Storage.
 * Path pattern: invoices/{orgId}/{invoiceYear}/{invoiceNumber}.pdf
 * e.g. invoices/abc-123/2026/INV-2026-00001.pdf
 *
 * Call this from:
 *   - confirm_payment Server Action (draft invoice — pass status hint if needed)
 *   - complete_order Server Action (final issued invoice)
 *   - reissue_invoice Server Action (after voiding — new invoice number)
 *
 * The pdfBuffer should be generated before calling this.
 * Store the returned path in order_invoices.pdf_path — never the signed URL.
 */
export async function uploadInvoicePdf({
  orgId,
  invoiceYear,
  invoiceNumber,
  pdfBuffer,
}: InvoiceUploadParams): Promise<UploadResult> {
  try {
    const filePath = `invoices/${orgId}/${invoiceYear}/${invoiceNumber}.pdf`;

    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(pdfBuffer, {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          orgId,
          invoiceYear: String(invoiceYear),
          invoiceNumber,
        },
      },
    });

    return { success: true, path: filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[uploadInvoicePdf] Firebase upload failed:", message);
    return { success: false, error: "Failed to upload invoice PDF" };
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

/**
 * Deletes a file from Firebase Storage by path.
 *
 * Use cases:
 *   - Customer re-uploads GCash proof after rejection
 *     → delete old proof before uploading new one
 *   - Invoice voided and reissued
 *     → delete old PDF before generating new one
 *
 * Does NOT throw — a missing file should never block
 * the DB operation that follows. Logs the error instead.
 */
export async function deleteStorageFile(filePath: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    await bucket.file(filePath).delete();
  } catch (error) {
    // File may already be gone — not fatal
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[deleteStorageFile] Failed to delete ${filePath}:`, message);
  }
}

// ─────────────────────────────────────────────
// Path Builders
// ─────────────────────────────────────────────
// Use these wherever you construct paths to avoid
// typos and keep the pattern consistent across the app.

export function buildPaymentProofPath(
  userId: string,
  orderId: string,
  extension: string,
): string {
  return `payment-proofs/${userId}/${orderId}.${extension}`;
}

export function buildInvoicePath(
  orgId: string,
  invoiceYear: string | number,
  invoiceNumber: string,
): string {
  return `invoices/${orgId}/${invoiceYear}/${invoiceNumber}.pdf`;
}

/**
 * Formats the human-readable invoice number from its components.
 * Use this in the app wherever you display the invoice number —
 * don't store the formatted string in the DB, store year + sequence separately.
 */
export function formatInvoiceNumber(
  invoiceYear: number,
  sequenceNumber: number,
): string {
  return `INV-${invoiceYear}-${String(sequenceNumber).padStart(5, "0")}`;
}
