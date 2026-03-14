"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { invalidateAddressesCache } from "@/lib/data/cache-helpers";

const addressSchema = z.object({
  label: z.enum(["home", "school", "office", "other"]),
  recipient_name: z.string().min(2).max(255),
  contact_number: z.string().min(7).max(20),
  street: z.string().min(2).max(255),
  barangay: z.string().optional(),
  city: z.string().min(2).max(100),
  province: z.string().min(2).max(100),
  postal_code: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function createAddress(
  input: z.infer<typeof addressSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = addressSchema.parse(input);

    const { data, error } = await supabase
      .from("user_addresses")
      .insert({ ...validated, user_id: user.id })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    invalidateAddressesCache(user.id);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[createAddress]", err);
    return { success: false, error: "Failed to create address" };
  }
}

export async function updateAddress(
  addressId: string,
  input: Partial<z.infer<typeof addressSchema>>,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("user_addresses")
      .update(input)
      .eq("id", addressId)
      .eq("user_id", user.id); // RLS + extra safety check

    if (error) return { success: false, error: error.message };

    invalidateAddressesCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[updateAddress]", err);
    return { success: false, error: "Failed to update address" };
  }
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    invalidateAddressesCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[deleteAddress]", err);
    return { success: false, error: "Failed to delete address" };
  }
}

export async function setDefaultAddress(
  addressId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase.rpc("set_default_address", {
      p_address_id: addressId,
      p_user_id: user.id,
    });

    if (error) return { success: false, error: error.message };

    invalidateAddressesCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[setDefaultAddress]", err);
    return { success: false, error: "Failed to set default address" };
  }
}
