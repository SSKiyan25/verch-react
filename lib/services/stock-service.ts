import { SupabaseClient } from "@supabase/supabase-js";

export type StockActionType = "add" | "remove" | "adjust" | "return";

interface StockAdjustmentItem {
  variationId: string;
  adjustment: number;
  action: StockActionType;
  reason?: string;
}

export async function processStockBatch(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  productId: string,
  adjustments: StockAdjustmentItem[]
) {
  const results = [];
  const errors = [];

  for (const item of adjustments) {
    try {
      // 1. Fetch current state
      const { data: current, error: fetchError } = await supabase
        .from("product_variations")
        .select("stock_quantity")
        .eq("id", item.variationId)
        .single();

      if (fetchError || !current)
        throw new Error(`Variation ${item.variationId} not found`);

      let newStock = current.stock_quantity;
      let quantityChange = 0;

      // 2. Calculate Math based on simplified actions
      switch (item.action) {
        case "add":
        case "return":
          // Both add to stock. 'return' is just semantically different for the logs.
          quantityChange = Math.abs(item.adjustment);
          newStock += quantityChange;
          break;

        case "remove":
          quantityChange = -Math.abs(item.adjustment);
          newStock += quantityChange;
          break;

        case "adjust":
          // Direct Override: "Stock count is actually X"
          // Change = Target - Current
          quantityChange = Math.abs(item.adjustment) - current.stock_quantity;
          newStock = Math.abs(item.adjustment);
          break;
      }

      // 3. Safety Check
      if (newStock < 0) {
        throw new Error(
          `Insufficient stock. Current: ${
            current.stock_quantity
          }, Requested Remove: ${Math.abs(item.adjustment)}`
        );
      }

      // 4. Update Database
      const { error: updateError } = await supabase
        .from("product_variations")
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString(),
          last_stock_update: new Date().toISOString(),
        })
        .eq("id", item.variationId);

      if (updateError) throw updateError;

      // 5. Create Log Entry
      // We only log if there was an actual numeric change
      if (quantityChange !== 0) {
        await supabase.from("stock_logs").insert({
          variation_id: item.variationId,
          product_id: productId,
          organization_id: organizationId,
          previous_quantity: current.stock_quantity,
          new_quantity: newStock,
          quantity_change: quantityChange,
          // Your Enum supports 'add', 'remove', 'adjust', 'return' directly
          action: item.action,
          performed_by: userId,
          source_type: "MANUAL_ADJUSTMENT",
          remarks: item.reason || `Manual ${item.action}`,
        });
      }

      results.push({ variationId: item.variationId, status: "success" });
    } catch (err) {
      console.error(`Error processing variation ${item.variationId}:`, err);
      errors.push({
        variationId: item.variationId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results, errors };
}
