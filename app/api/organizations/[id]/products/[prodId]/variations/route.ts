/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { z } from "zod";
import { createVariationInternal } from "@/lib/services/product-service";

const createVariationSchema = z.object({
  sku: z.string().optional().nullable(),
  attributes: z.record(z.string(), z.any()).optional(),
  variation_name: z.string().optional().nullable(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).optional().nullable(),
  stock_quantity: z.number().int().min(0).default(0),
  pre_order_quantity: z.number().int().min(0).optional(),
  is_available: z.boolean().optional(),
});

// --- FIX 1: POST Method ---
export async function POST(
  request: NextRequest,
  // 1. Change Type to Promise
  { params }: { params: Promise<{ id: string; prodId: string }> }
) {
  try {
    // 2. Await the params before using them
    const { id, prodId } = await params;

    const supabase = await createClient();
    const user = await getCurrentUser();

    // Now this will log the correct UUID instead of 'undefined'
    console.log("Creating variation for product ID:", prodId);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createVariationSchema.parse(body);

    const newVariation = await createVariationInternal(
      supabase,
      user.id,
      id, // use the awaited variable
      prodId, // use the awaited variable
      validatedData
    );

    return NextResponse.json({
      success: true,
      data: newVariation,
      message: "Variation created successfully",
    });
  } catch (error) {
    console.error("Error creating variation:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// --- FIX 2: GET Method ---
export async function GET(
  request: NextRequest,
  // 1. Change Type to Promise
  { params }: { params: Promise<{ id: string; prodId: string }> }
) {
  try {
    // 2. Await the params
    const { prodId } = await params;

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: variations, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", prodId) // use the awaited variable
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: variations });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
