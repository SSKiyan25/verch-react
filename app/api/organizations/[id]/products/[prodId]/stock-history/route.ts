import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId, prodId: productId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user belongs to organization
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const action = searchParams.get("action");
    const variationId = searchParams.get("variationId");
    const search = searchParams.get("search");

    // Build query
    let query = supabase
      .from("stock_logs")
      .select("*", { count: "exact" })
      .eq("product_id", productId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (action && action !== "all") {
      query = query.eq("action", action);
    }

    if (variationId && variationId !== "all") {
      query = query.eq("variation_id", variationId);
    }

    if (search) {
      query = query.or(
        `remarks.ilike.%${search}%,source_type.ilike.%${search}%`
      );
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error("Error fetching stock logs:", logsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch stock history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Unexpected error fetching stock history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
