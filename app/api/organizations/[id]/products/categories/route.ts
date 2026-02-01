import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { ProductCategory } from "@/lib/types/product";
import { z } from "zod";

// ✅ 1. Define the Context Type (Next.js 15 Requirement)
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation schema for creating a category
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name too long"),
  description: z
    .string()
    .max(1000, "Description too long")
    .optional()
    .nullable(),
  parent_id: z
    .string()
    .uuid("Invalid parent category ID")
    .optional()
    .nullable(),
  sort_order: z.number().int().min(0).default(0),
  icon: z.string().max(50).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: RouteContext // ✅ 2. Use the Promise Type
) {
  try {
    // ✅ 3. Await params before access
    const { id } = await params;
    const organizationId = id;

    console.log("📍 Categories API called for organization:", organizationId);

    // Validate organization ID format
    if (
      !organizationId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        organizationId
      )
    ) {
      console.log("❌ Invalid organization ID format");
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      console.log("❌ No authenticated user");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Updated logic: Check if user has access to this organization
    const hasOrgAccess = user.organization_id === organizationId;
    const isAdmin = ["admin"].includes(user.role || "");

    if (!hasOrgAccess && !isAdmin) {
      console.log("❌ User doesn't belong to this organization");
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Check if user has permission to view categories
    const canViewCategories = [
      "admin",
      "organization_admin",
      "organization_manager",
      "organization_staff",
    ].includes(user.role || "");

    if (!canViewCategories) {
      console.log("❌ Insufficient permissions");
      return NextResponse.json(
        { error: "Insufficient permissions to view categories" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";
    const parentId = searchParams.get("parent_id");

    // Build query
    let query = supabase
      .from("product_categories")
      .select(
        `
        *,
        parent:parent_id(id, name),
        children:product_categories!parent_id(id, name, sort_order, is_active)
      `
      )
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error("❌ Categories fetch error:", categoriesError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    console.error("❌ Categories fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext // ✅ 4. Use Promise Type here too
) {
  try {
    // ✅ 5. Await params here too
    const { id } = await params;
    const organizationId = id;

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

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    const canCreateCategories = [
      "admin",
      "organization_admin",
      "organization_manager",
    ].includes(user.role || "");

    if (!canCreateCategories) {
      return NextResponse.json(
        { error: "Insufficient permissions to create categories" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: existingCategory, error: slugCheckError } = await supabase
      .from("product_categories")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", slug)
      .single();

    if (slugCheckError && slugCheckError.code !== "PGRST116") {
      console.error("Slug check error:", slugCheckError);
      return NextResponse.json(
        { error: "Failed to validate category name" },
        { status: 500 }
      );
    }

    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    if (validatedData.parent_id) {
      const { data: parentCategory, error: parentError } = await supabase
        .from("product_categories")
        .select("id")
        .eq("id", validatedData.parent_id)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .eq("is_active", true)
        .single();

      if (parentError || !parentCategory) {
        return NextResponse.json(
          { error: "Invalid or inactive parent category" },
          { status: 400 }
        );
      }
    }

    const categoryData: Omit<
      ProductCategory,
      "id" | "created_at" | "updated_at"
    > = {
      organization_id: organizationId,
      name: validatedData.name.trim(),
      slug,
      description: validatedData.description?.trim() || null,
      parent_id: validatedData.parent_id || null,
      sort_order: validatedData.sort_order,
      is_active: true,
      is_custom: true,
      icon: validatedData.icon || null,
    };

    const { data: category, error: insertError } = await supabase
      .from("product_categories")
      .insert(categoryData)
      .select(
        `
        *,
        parent:parent_id(id, name)
      `
      )
      .single();

    if (insertError) {
      console.error("Category creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Category creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
