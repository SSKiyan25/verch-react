"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateOrgOrdersCache,
  invalidateOrgOrderDetailCache,
  invalidateOrderCache,
} from "@/lib/data/cache-helpers";
import { reissueInvoiceSchema } from "@/features/org/orders/schemas/orgOrderSchemas";
import { generateInvoicePdf } from "@/lib/pdf/invoiceGenerator";
import {
  uploadInvoicePdf,
  deleteStorageFile,
} from "@/lib/firebase/storage-helpers";
import { fetchOrgOrderDetail } from "@/lib/supabase/queries/org-orders";

import { ActionResult } from '@/lib/types/actions';


export async function reissueInvoiceAction(
  input: z.infer<typeof reissueInvoiceSchema>,
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
    const validated = reissueInvoiceSchema.parse(input);

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

    // 5. Fetch old invoice to get previous PDF path
    const { data: oldInvoiceRow } = await supabase
      .from("order_invoices")
      .select("pdf_path")
      .eq("order_id", validated.orderId)
      .single();

    const oldPdfPath = oldInvoiceRow?.pdf_path;

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

    // 7. Call reissue_invoice RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "reissue_invoice",
      {
        p_admin_user_id: user.id,
        p_order_id: validated.orderId,
      },
    );

    if (rpcError) return { success: false, error: rpcError.message };

    const rpcRow = (rpcData as unknown[])[0] as Record<string, unknown>;
    const newInvoiceId = rpcRow.out_invoice_id as string;
    const newInvoiceNumber = rpcRow.out_invoice_number as string;

    // 8. Invoice number from RPC

    // 9. Delete old PDF from Firebase if it exists
    if (oldPdfPath) {
      try {
        await deleteStorageFile(oldPdfPath);
      } catch (err) {
        console.error("[reissueInvoiceAction] Failed to delete old PDF", err);
        // Non-fatal — continue with reissue
      }
    }

    // 10. Generate final PDF (not draft)
    const pdfBuffer = await generateInvoicePdf(
      {
        invoiceNumber: newInvoiceNumber,
        invoiceYear: new Date().getFullYear(),
        issuedAt: new Date().toISOString(),
        order: orderDetail,
        orgName: orgData?.name ?? "Organization",
        orgLogoUrl: orgData?.logo_image_url ?? null,
        orgContactEmail: orgData?.contact_email ?? null,
        isDraft: false,
      },
      false,
    );

    // 11. Upload new PDF to Firebase
    const uploadResult = await uploadInvoicePdf({
      orgId,
      invoiceYear: new Date().getFullYear(),
      invoiceNumber: newInvoiceNumber,
      pdfBuffer,
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: `Failed to upload reissued invoice PDF: ${uploadResult.error}`,
      };
    }

    // 12. Save PDF path to DB for the new invoice
    const { error: pathUpdateError } = await supabase
      .from("order_invoices")
      .update({ pdf_path: uploadResult.path })
      .eq("id", newInvoiceId);

    if (pathUpdateError) {
      console.error(
        "[reissueInvoiceAction] Failed to save PDF path",
        pathUpdateError.message,
      );
      // Do not fail the action — invoice is created, PDF path can be fixed manually
    }

    // 13. Invalidate caches
    invalidateOrgOrdersCache(orgId);
    invalidateOrgOrderDetailCache(validated.orderId);
    invalidateOrderCache(validated.orderId, customerId, orgId);

    // 14. Revalidate paths
    revalidatePath("/org/orders", "page");
    revalidatePath(`/org/orders/${validated.orderId}`, "page");

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[reissueInvoiceAction]", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
