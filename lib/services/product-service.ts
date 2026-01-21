/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";

export async function createVariationInternal(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  productId: string,
  data: any
) {
  // 1. Insert Variation
  const { data: variation, error } = await supabase
    .from("product_variations")
    .insert({
      product_id: productId,
      sku: data.sku || null,
      attributes: data.attributes || {},
      variation_name: data.variation_name || null,
      price: data.price,
      compare_at_price: data.compare_at_price || null,
      stock_quantity: data.stock_quantity || 0,
      reserved_quantity: 0,
      is_available: true,
      is_archived: false,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Insert Stock Log (if quantity > 0)
  if (data.stock_quantity && data.stock_quantity > 0) {
    const { error: logError } = await supabase.from("stock_logs").insert({
      variation_id: variation.id,
      product_id: productId,
      organization_id: organizationId,
      previous_quantity: 0,
      new_quantity: data.stock_quantity,
      quantity_change: data.stock_quantity,
      action: "add",

      source_type: "variation_creation",
      source_id: variation.id,
      performed_by: userId,
      remarks: "Initial stock from variation creation",
    });

    if (logError) console.error("Failed to create stock log:", logError);
  }

  return variation;
}
