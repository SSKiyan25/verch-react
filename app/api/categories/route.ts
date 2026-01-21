import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProductCategory } from "@/lib/types/product";
import { z } from "zod";

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

export async function GET(request: NextRequest) {
  try {
    console.log("📍 Global Categories API called");

    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";
    const parentId = searchParams.get("parent_id");

    console.log("🔍 Query params:", { includeInactive, parentId });

    // Build query - get ALL categories (global system categories)
    let query = supabase
      .from("product_categories")
      .select(
        `
        *,
        parent:parent_id(id, name),
        children:product_categories!parent_id(id, name, sort_order, is_active)
      `
      )
      // Get all categories where organization_id is NULL (global categories)
      .is("organization_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    // Filter by active status
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Filter by parent category
    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      // Only root categories (no parent)
      query = query.is("parent_id", null);
    }

    console.log("🔍 Executing global categories query...");
    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error("❌ Categories fetch error:", categoriesError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    console.log("✅ Global categories fetched successfully:", {
      count: categories?.length || 0,
      categories: categories?.map((c) => ({
        id: c.id,
        name: c.name,
        organization_id: c.organization_id,
      })),
    });

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    console.error("❌ Global categories fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📍 Global Categories POST called");

    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Generate slug from name
    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug already exists in global categories
    const { data: existingCategory, error: slugCheckError } = await supabase
      .from("product_categories")
      .select("id")
      .is("organization_id", null)
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
        { error: "A global category with this name already exists" },
        { status: 409 }
      );
    }

    // Validate parent category exists if provided
    if (validatedData.parent_id) {
      const { data: parentCategory, error: parentError } = await supabase
        .from("product_categories")
        .select("id")
        .eq("id", validatedData.parent_id)
        .is("organization_id", null) // Only global categories as parents
        .eq("is_active", true)
        .single();

      if (parentError || !parentCategory) {
        return NextResponse.json(
          { error: "Invalid or inactive parent category" },
          { status: 400 }
        );
      }
    }

    // Prepare category data - organization_id = null for global categories
    const categoryData: Omit<
      ProductCategory,
      "id" | "created_at" | "updated_at"
    > = {
      organization_id: null, // Global category
      name: validatedData.name.trim(),
      slug,
      description: validatedData.description?.trim() || null,
      parent_id: validatedData.parent_id || null,
      sort_order: validatedData.sort_order,
      is_active: true,
      is_custom: true,
      icon: validatedData.icon || null,
    };

    // Insert category
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

    console.log("✅ Global category created:", category);

    return NextResponse.json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Global category creation error:", error);

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
