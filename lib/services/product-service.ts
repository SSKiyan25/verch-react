/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";

// --- CONFIGURATION ---
const STOCK_ACTIONS = {
  ADD: "add", // + Stock (matches schema Enum)
  REMOVE: "remove", // - Stock (matches schema Enum)
  ARCHIVE: "remove", // Archiving removes availability
} as const;

// --- INTERFACES ---
interface CreateVariationParams {
  sku?: string | null;
  attributes?: Record<string, any>;
  variation_name?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity?: number;
  pre_order_quantity?: number; // <--- ADDED to match Schema
}

interface UpdateVariationParams {
  sku?: string | null;
  attributes?: Record<string, any>;
  variation_name?: string | null;
  price?: number;
  compare_at_price?: number | null;
  stock_quantity?: number;
  pre_order_quantity?: number; // <--- ADDED to match Schema
  is_available?: boolean;
  is_archived?: boolean;
}

// --- CREATE ---
export async function createVariationInternal(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  productId: string,
  data: CreateVariationParams
) {
  try {
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
        pre_order_quantity: data.pre_order_quantity || 0, // <--- ADDED
        reserved_quantity: 0,
        is_available: true,
        is_archived: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert Stock Log (if quantity > 0)
    if (data.stock_quantity && data.stock_quantity > 0) {
      await supabase.from("stock_logs").insert({
        variation_id: variation.id,
        product_id: productId,
        organization_id: organizationId,
        previous_quantity: 0,
        new_quantity: data.stock_quantity,
        quantity_change: data.stock_quantity,
        action: STOCK_ACTIONS.ADD,
        source_type: "variation_creation",
        source_id: variation.id,
        performed_by: userId,
        remarks: "Initial stock from variation creation",
      });
    }

    console.log("Variation created successfully");
    return variation;
  } catch (error) {
    console.error("Failed to create variation");
    throw error;
  }
}

// --- UPDATE ---
export async function updateVariationInternal(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  productId: string,
  variationId: string,
  data: UpdateVariationParams
) {
  try {
    // 1. Fetch current variation
    // We need reserved_quantity to ensure we don't violate the DB constraint
    const { data: current, error: fetchError } = await supabase
      .from("product_variations")
      .select("stock_quantity, reserved_quantity, is_archived")
      .eq("id", variationId)
      .single();

    if (fetchError || !current) throw new Error("Variation not found");

    // --- CHECK FOR RESTORE ACTION ---
    // We detect this BEFORE the update happens
    const isRestoring = current.is_archived && data.is_archived === false;

    // 2. LOGIC CHECK: Prevent updates on Archived items
    if (current.is_archived && data.is_archived !== false) {
      if (
        data.stock_quantity !== undefined &&
        data.stock_quantity !== current.stock_quantity
      ) {
        throw new Error(
          "Cannot update stock on an archived variation. Unarchive it first."
        );
      }
    }

    // 3. LOGIC CHECK: DB Constraint `valid_reserved_stock`
    // This prevents the API from crashing with a DB error by catching it early
    if (data.stock_quantity !== undefined) {
      if (data.stock_quantity < current.reserved_quantity) {
        throw new Error(
          `Cannot reduce stock to ${data.stock_quantity}. You have ${current.reserved_quantity} items reserved by customers.`
        );
      }
    }

    // 4. Prepare Update
    // Note: We don't need to pass updated_at manually if your DB trigger handles it,
    // but keeping it here is safe.
    const updates: any = { ...data, updated_at: new Date().toISOString() };

    if (
      data.stock_quantity !== undefined &&
      data.stock_quantity !== current.stock_quantity
    ) {
      updates.last_stock_update = new Date().toISOString();
    }

    // 5. Perform Update
    const { data: updatedVariation, error: updateError } = await supabase
      .from("product_variations")
      .update(updates)
      .eq("id", variationId)
      .eq("product_id", productId)
      .select()
      .single();

    if (updateError) {
      // If the race condition hit and DB constraint failed, catch it here
      if (updateError.message.includes("valid_reserved_stock")) {
        throw new Error("Stock cannot be lower than reserved quantity.");
      }
      throw updateError;
    }

    // 6. LOGGING - STOCK CHANGES (Existing logic)
    if (
      data.stock_quantity !== undefined &&
      data.stock_quantity !== current.stock_quantity
    ) {
      const quantityChange = data.stock_quantity - current.stock_quantity;

      // Logic: Increase = ADD, Decrease = REMOVE
      const action =
        quantityChange > 0 ? STOCK_ACTIONS.ADD : STOCK_ACTIONS.REMOVE;

      await supabase.from("stock_logs").insert({
        variation_id: variationId,
        product_id: productId,
        organization_id: organizationId,
        previous_quantity: current.stock_quantity,
        new_quantity: data.stock_quantity,
        quantity_change: quantityChange,
        action: action,
        performed_by: userId,
        source_type: "API_USER",
        remarks:
          quantityChange > 0 ? "Manual Restock" : "Manual Correction/Removal",
      });
    }

    // 7. LOGGING - RESTORE ACTION (New logic)
    // We log this specifically so the user sees why the item "came back"
    if (isRestoring) {
      await supabase.from("stock_logs").insert({
        variation_id: variationId,
        product_id: productId,
        organization_id: organizationId,
        previous_quantity: updatedVariation.stock_quantity,
        new_quantity: updatedVariation.stock_quantity, // No change
        quantity_change: 0, // Explicitly 0
        action: "add", // Enum: add (Balancing the "remove" from archive)
        source_type: "RESTORE_ACTION",
        source_id: null,
        performed_by: userId,
        remarks: "Variation restored from archive",
      });
    }

    console.log("Variation updated successfully");
    return updatedVariation;
  } catch (error) {
    console.error("Failed to update variation");
    throw error;
  }
}

// --- DELETE (Soft Delete) ---
export async function deleteVariationInternal(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  productId: string,
  variationId: string
) {
  try {
    // 1. Get current stock
    const { data: current } = await supabase
      .from("product_variations")
      .select("stock_quantity")
      .eq("id", variationId)
      .single();

    const quantity = current?.stock_quantity || 0;

    // 2. Archive it (Soft Delete)
    const { error } = await supabase
      .from("product_variations")
      .update({
        is_archived: true,
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variationId)
      .eq("product_id", productId);

    if (error) throw error;

    // 3. Log the "Removal"
    if (quantity > 0) {
      await supabase.from("stock_logs").insert({
        variation_id: variationId,
        product_id: productId,
        organization_id: organizationId,
        previous_quantity: quantity,
        new_quantity: quantity,
        quantity_change: 0,
        action: STOCK_ACTIONS.ARCHIVE,
        performed_by: userId,
        source_type: "ARCHIVE_ACTION",
        remarks: "Variation archived (Soft Delete)",
      });
    }

    console.log("Variation archived successfully");
    return true;
  } catch (error) {
    console.error("Failed to archive variation");
    throw error;
  }
}
