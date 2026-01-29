/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"; // Use NextRequest
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prodId: string }> } // ✅ Fix: params is a Promise
) {
  try {
    // 1. Await params properly
    const { id: organizationId, prodId } = await params;

    // 2. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Optional: Verify user actually belongs to the organization in the URL
    if (user.organization_id !== organizationId) {
      // Logic depends on your app - usually strict equality is good security
    }

    const supabase = await createClient();
    const body = await request.json();

    // 3. Whitelist Fields (Security)
    const allowedFields = [
      "name",
      "category_old",
      "status",
      "description",
      "search_keywords",
      "is_approved",
      "total_sales",
      "total_orders",
      "is_discounted",
      "discount_type",
      "discount_target",
      "discount_value",
      "featured_photo_url",
      "photo_urls",
      "can_pre_order",
      "is_archived",
      "category_id",
      "supplier_id", // ✅ Ensure this is here
    ];

    const updates: Record<string, any> = {};
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided" },
        { status: 400 }
      );
    }

    // 4. Perform Update
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", prodId)
      .eq("organization_id", organizationId)
      .select(
        `
        *,
        category:product_categories(id, name, slug, description),
        variations:product_variations(*),
        supplier:suppliers(*)
      `
      )
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
