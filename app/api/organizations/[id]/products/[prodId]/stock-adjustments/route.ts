import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { processStockBatch } from "@/lib/services/stock-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prodId: string }> }
) {
  try {
    const { id: organizationId, prodId: productId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adjustments } = body;
    // Expecting payload: { adjustments: [ { variationId, adjustment, action, reason }, ... ] }

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: "No adjustments provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { results, errors } = await processStockBatch(
      supabase,
      user.id,
      organizationId,
      productId,
      adjustments
    );

    if (errors.length > 0 && results.length === 0) {
      // All failed
      return NextResponse.json(
        { error: "Failed to update stock", details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { results, errors },
      message:
        errors.length > 0
          ? "Some updates failed"
          : "Stock updated successfully",
    });
  } catch (error) {
    console.error("Stock Batch Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
