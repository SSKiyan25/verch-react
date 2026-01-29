import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; prodId: string }> }
) {
  try {
    const supabase = await createClient();

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

    const { id: organizationId, prodId: productId } = await params;

    // Verify user belongs to organization by checking their organization_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user belongs to the organization
    if (userData.organization_id !== organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied - not a member of this organization",
        },
        { status: 403 }
      );
    }

    // Fetch product with all details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        *,
        category:product_categories(id, name, slug, description),
        variations:product_variations(
          *
        )
      `
      )
      .eq("id", productId)
      .eq("organization_id", organizationId)
      .single();

    if (productError) {
      console.error("Error fetching product:", productError);
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Unexpected error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
