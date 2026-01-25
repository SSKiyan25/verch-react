/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; prodId: string } }
) {
  const user = await getCurrentUser();
  const { prodId } = await params;
  if (!user) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }
  const organizationId = user.organization_id;

  try {
    const supabase = await createClient();
    const body = await request.json();

    // 2. Security Whitelist
    // We strictly define what fields are allowed to be updated.
    // This prevents users from manually sending { "account_id": "hack" } to change ownership.
    const allowedFields = [
      "name",
      "category_old",
      "status",
      "description",
      "search_keywords", // text[]
      "is_approved",
      "total_sales",
      "total_orders",
      "is_discounted",
      "discount_type",
      "discount_target",
      "discount_value",
      "featured_photo_url",
      "photo_urls", // jsonb
      "can_pre_order",
      "is_archived",
      "category_id",
      "supplier_id",
    ];

    // 3. Filter the incoming body
    const updates: Record<string, any> = {};

    Object.keys(body).forEach((key) => {
      // Only add the field to the update list if it is in our whitelist
      if (allowedFields.includes(key)) {
        updates[key] = body[key];
      }
    });

    // 4. Guard Clause: If the filtered update object is empty, stop here.
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // 5. Perform the Update
    const { data, error } = await supabase
      .from("products")
      .update(updates) // Supabase automatically handles partial updates here
      .eq("id", prodId)
      .eq("organization_id", organizationId) // Double security: ensure product belongs to this org
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      data: data,
    });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
