"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import { confirmPaymentSchema } from "@/features/org/orders/schemas/orgOrderSchemas";
import { generateInvoicePdf } from "@/lib/pdf/invoiceGenerator";
import { uploadInvoicePdf } from "@/lib/firebase/storage-helpers";
import { fetchOrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function buildInvoiceNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequenceNumber).padStart(5, "0")}`;
}

export async function confirmPaymentAction(
  input: z.infer<typeof confirmPaymentSchema>,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Role gate
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: "User not found" };
    }

    if (
      !["organization_admin", "organization_manager"].includes(
        userRecord.role ?? "",
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 3. Validate input
    const validated = confirmPaymentSchema.parse(input);

    // 4. Fetch order's user_id and organization_id for cache invalidation
    const { data: orderRow, error: orderFetchError } = await supabase
      .from("orders")
      .select("user_id, organization_id")
      .eq("id", validated.orderId)
      .single();

    if (orderFetchError || !orderRow) {
      return { success: false, error: "Order not found" };
    }

    const customerId = orderRow.user_id;
    const orgId = orderRow.organization_id;

    // 5. Call confirm_payment RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "confirm_payment",
      {
        p_admin_user_id: user.id,
        p_order_id: validated.orderId,
      },
    );

    if (rpcError) return { success: false, error: rpcError.message };

    const rpcRow = (rpcData as unknown[])[0] as Record<string, unknown>;
    const invoiceId = rpcRow.out_invoice_id as string;
    const invoiceSequenceNumber = rpcRow.out_invoice_sequence_number as number;

    // 6. Fetch order detail for PDF content
    const orderDetail = await fetchOrgOrderDetail(user.id, validated.orderId);

    if (!orderDetail) {
      return { success: false, error: "Failed to fetch order detail for PDF" };
    }

    // 6.5. Fetch organization data for PDF
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name, logo_image_url, contact_email")
      .eq("id", orgId)
      .single();

    // 7. Build invoice number
    const invoiceNumber = buildInvoiceNumber(invoiceSequenceNumber);

    // 8. Generate draft PDF
    const pdfBuffer = await generateInvoicePdf(
      {
        invoiceNumber,
        invoiceYear: new Date().getFullYear(),
        issuedAt: null,
        order: orderDetail,
        orgName: orgData?.name ?? "Organization",
        orgLogoUrl: orgData?.logo_image_url ?? null,
        orgContactEmail: orgData?.contact_email ?? null,
        isDraft: true,
      },
      true,
    );

    // 9. Upload PDF to Firebase
    const uploadResult = await uploadInvoicePdf({
      orgId,
      invoiceYear: new Date().getFullYear(),
      invoiceNumber,
      pdfBuffer,
    });

    if (!uploadResult.success) {
      console.error(
        "[confirmPaymentAction] PDF upload failed:",
        uploadResult.error,
      );
      // Do not fail the action — payment is confirmed, PDF path can be fixed manually
    } else {
      // 10. Save PDF path to DB
      const { error: pathUpdateError } = await supabase
        .from("order_invoices")
        .update({ pdf_path: uploadResult.path })
        .eq("id", invoiceId);

      if (pathUpdateError) {
        console.error(
          "[confirmPaymentAction] Failed to save PDF path",
          pathUpdateError.message,
        );
        // Do not fail the action — payment is confirmed, PDF path can be fixed manually
      }
    }

    // 11. Invalidate caches
    invalidateOrgOrdersCache(orgId);
    invalidateOrgOrderDetailCache(validated.orderId);
    invalidateOrderCache(validated.orderId, customerId, orgId);

    // 12. Revalidate paths
    revalidatePath("/org/orders", "page");
    revalidatePath(`/org/orders/${validated.orderId}`, "page");

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[confirmPaymentAction]", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
