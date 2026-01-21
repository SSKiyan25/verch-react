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

    const organizationId = user.organization_id;

    // Validate organization ID format
    if (
      !organizationId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        organizationId
      )
    ) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    // Check if user has permission to view products
    const canViewProducts = [
      "admin",
      "organization_admin",
      "organization_manager",
      "organization_staff",
    ].includes(user.role || "");

    if (!canViewProducts) {
      return NextResponse.json(
        { error: "Insufficient permissions to view products" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;
    const status = searchParams.get("status");
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const isArchived = searchParams.get("is_archived") === "true";

    // Build query
    let query = supabase
      .from("products")
      .select(
        `
    *,
    category:product_categories(*),
    variations:product_variations(
      id,
      product_id,
      sku,
      attributes,
      variation_name,
      price,
      compare_at_price,
      stock_quantity,
      reserved_quantity,
      pre_order_quantity,
      completed_orders,
      cancelled_orders,
      available_quantity,
      is_available,
      is_archived,
      created_at,
      updated_at,
      last_stock_update
    )
  `
      )
      .eq("organization_id", organizationId)
      .eq("is_archived", isArchived);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: products, error: productsError } = await query;

    if (productsError) {
      console.error("Products fetch error:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_archived", isArchived);

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    if (categoryId) {
      countQuery = countQuery.eq("category_id", categoryId);
    }

    if (search) {
      countQuery = countQuery.or(
        `name.ilike.%${search}%, description.ilike.%${search}%`
      );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Products count error:", countError);
    }

    return NextResponse.json({
      success: true,
      data: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
