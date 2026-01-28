import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { z } from "zod";
import {
  updateVariationInternal,
  deleteVariationInternal,
} from "@/lib/services/product-service";

// Define the Params type once for consistency
type RouteParams = Promise<{
  id: string;
  prodId: string;
  variationId: string;
}>;

const updateVariationSchema = z.object({
  sku: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  variation_name: z.string().nullable().optional(),
  price: z.number().min(0).optional(),
  compare_at_price: z.number().min(0).nullable().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  pre_order_quantity: z.number().int().min(0).optional(),
  is_available: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

// --- GET ---
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams } // Type changed to Promise
) {
  try {
    // 1. Await params before accessing properties
    const { prodId, variationId } = await params;

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: variation, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("id", variationId) // Now uses the awaited value
      .eq("product_id", prodId)
      .single();

    if (error || !variation) {
      return NextResponse.json(
        { error: "Variation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: variation });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- PATCH ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id, prodId, variationId } = await params;
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateVariationSchema.parse(body);

    const updatedVariation = await updateVariationInternal(
      supabase,
      user.id,
      id,
      prodId,
      variationId,
      validatedData
    );

    return NextResponse.json({
      success: true,
      data: updatedVariation,
      message: "Variation updated successfully",
    });
  } catch (error) {
    console.error("Update Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- DELETE ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams } // Type changed to Promise
) {
  try {
    // 1. Await params before accessing properties
    const { id, prodId, variationId } = await params;

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await deleteVariationInternal(
      supabase,
      user.id,
      id,
      prodId,
      variationId // Now uses the awaited value
    );

    return NextResponse.json({
      success: true,
      message: "Variation archived successfully",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
