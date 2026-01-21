import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const variationId = searchParams.get("variation_id");
    const productId = searchParams.get("product_id");

    let query = supabase
      .from("stock_logs")
      .select("*")
      .eq("organization_id", user.organization_id)
      .order("created_at", { ascending: false });

    if (variationId) {
      query = query.eq("variation_id", variationId);
    }

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: stockLogs, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch stock logs",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stockLogs,
      count: stockLogs.length,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
