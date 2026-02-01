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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";
    const parentId = searchParams.get("parent_id");

    let query = supabase
      .from("product_categories")
      .select(
        `*, parent:parent_id(id, name), children:product_categories!parent_id(id, name, sort_order, is_active)`
      )
      .is("organization_id", null) // Global categories only
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error("❌ Categories fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: categories || [] });
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
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check slug
    const { data: existing } = await supabase
      .from("product_categories")
      .select("id")
      .is("organization_id", null)
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    // Validate Parent
    if (validatedData.parent_id) {
      const { data: parent } = await supabase
        .from("product_categories")
        .select("id")
        .eq("id", validatedData.parent_id)
        .is("organization_id", null)
        .eq("is_active", true)
        .single();

      if (!parent)
        return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }

    const categoryData: Omit<
      ProductCategory,
      "id" | "created_at" | "updated_at"
    > = {
      organization_id: null,
      name: validatedData.name.trim(),
      slug,
      description: validatedData.description?.trim() || null,
      parent_id: validatedData.parent_id || null,
      sort_order: validatedData.sort_order,
      is_active: true,
      is_custom: true,
      icon: validatedData.icon || null,
    };

    const { data: category, error } = await supabase
      .from("product_categories")
      .insert(categoryData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: category,
      message: "Category created",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
