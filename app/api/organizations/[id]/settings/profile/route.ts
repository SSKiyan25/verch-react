/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schemas
const basicInfoSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  contact_email: z.string().email({ message: "Invalid email format" }),
  phone_number: z.string().optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500),
});

const addressSchema = z.object({
  faculty: z.string().min(1, "Faculty is required"),
  department: z.string().min(1, "Department is required"),
  building: z.string().min(1, "Building is required"),
  room: z.string().optional(),
  campus: z.string().optional(),
  description: z.string().optional(),
});

const imagesSchema = z.object({
  logo_image_url: z.string().optional(),
  logo_image_path: z.string().optional(),
  cover_image_url: z.string().optional(),
  cover_image_path: z.string().optional(),
  images_url: z
    .array(
      z.object({
        url: z.string(),
        path: z.string(),
      })
    )
    .optional(),
});

const profileUpdateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("basic_info"),
    data: basicInfoSchema,
  }),
  z.object({
    type: z.literal("address"),
    data: addressSchema,
  }),
  z.object({
    type: z.literal("images"),
    data: imagesSchema,
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { type, data } = validation.data;

    // Check if user owns this organization
    const { data: orgCheck, error: orgCheckError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (orgCheckError || !orgCheck) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update based on type
    let updateData: any = {};

    if (type === "basic_info") {
      updateData = {
        name: data.name,
        contact_email: data.contact_email,
        phone_number: data.phone_number || null,
        description: data.description,
      };
    } else if (type === "address") {
      updateData = {
        address: data,
      };
    } else if (type === "images") {
      updateData = {
        logo_image_url: data.logo_image_url || null,
        logo_image_path: data.logo_image_path || null,
        cover_image_url: data.cover_image_url || null,
        cover_image_path: data.cover_image_path || null,
        images_url: data.images_url || null,
      };
    }

    // Add last_modified timestamp
    updateData.last_modified = new Date().toISOString();

    // Update the organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${
        type === "basic_info"
          ? "Basic information"
          : type === "address"
          ? "Address"
          : "Images"
      } updated successfully`,
      organization: updatedOrg,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
