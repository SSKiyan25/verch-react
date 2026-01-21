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
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; prodId: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createVariationSchema.parse(body);

    // 2. REFACTOR: Use the shared function instead of rewriting the logic
    // This automatically handles the Insert + The Stock Log + The Error Handling
    const newVariation = await createVariationInternal(
      supabase,
      user.id,
      params.id, // organizationId
      params.prodId, // productId
      validatedData
    );

    console.log("Variation created with ID:", newVariation.id);

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
