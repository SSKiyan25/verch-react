"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getSignedDownloadUrl,
  SIGNED_URL_EXPIRY,
} from "@/lib/firebase/storage-helpers";

const GetInvoiceUrlSchema = z.object({
  invoicePdfPath: z.string().min(1, "Invoice path is required"),
  orderId: z.string().uuid("Invalid order ID"),
});

type GetInvoiceUrlResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function getInvoiceUrlAction(input: {
  invoicePdfPath: string;
  orderId: string;
}): Promise<GetInvoiceUrlResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = GetInvoiceUrlSchema.parse(input);

    // Verify the invoice belongs to an order the user owns OR is org staff for
    // Using get_order_detail RPC which already handles access control
    const { data, error: verifyError } = await supabase.rpc(
      "get_order_detail",
      {
        p_user_id: user.id,
        p_order_id: validated.orderId,
      },
    );

    if (verifyError || !data || !(data as unknown[]).length) {
      return { success: false, error: "Invoice not found or access denied" };
    }

    const url = await getSignedDownloadUrl(
      validated.invoicePdfPath,
      SIGNED_URL_EXPIRY.INVOICE,
    );

    return { success: true, url };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[getInvoiceUrlAction]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
