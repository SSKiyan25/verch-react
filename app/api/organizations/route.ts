/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/organizations - List organizations
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("date_created", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ organizations: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/organizations - Create organization
export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Step 1: Create user in Supabase Auth
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: formData.name, // Use organization name as initial full_name
          role: "organization_admin",
        },
      });

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error("Failed to create user account");
    }

    console.log("Auth user created:", authUser.user.id);

    try {
      // Step 2: Create organization record
      const organizationData = {
        id: authUser.user.id, // Use auth user ID as organization ID
        name: formData.name,
        contact_email: formData.email,
        phone_number: formData.contactNumber || null,
        description: formData.description || null,
        address: {},
        address_images_url: [],
        search_keywords: [],
        logo_image_url: formData.logoUrl || null,
        logo_image_path: null,
        cover_image_url: null,
        cover_image_path: null,
        images_url: [],
        settings: {
          businessHours: {},
          commissionRate: formData.commissionRate || 5.0,
          autoAcceptOrders: false,
          requireOrderApproval: true,
        },
        total_paid: 0,
        total_due: 0,
        last_payment_date: null,
        payment_method: null,
        date_created: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        status: "draft",
        is_public: false,
        is_setup_complete: false,
        is_verified: formData.isVerified || false,
        verification: formData.isVerified
          ? {
              verifiedAt: new Date().toISOString(),
              verifiedBy: "email_verification",
            }
          : {},
      };

      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert([organizationData])
        .select()
        .single();

      if (orgError) throw orgError;

      console.log("Organization created:", organization.id);

      // Step 3: Create user record in users table
      const userData = {
        id: authUser.user.id,
        full_name: formData.name, // Use organization name as initial full_name
        avatar_url: null,
        role: "organization_admin",
        contact_number: formData.contactNumber || null,
        is_verified: formData.isVerified || false,
        has_agreed_to_terms: false,
        has_changed_default_password: false,
        organization_id: organization.id,
      };

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert([userData])
        .select()
        .single();

      if (userError) {
        console.error("User creation error:", userError);
        // If user creation fails, delete the organization and auth user
        await supabase.from("organizations").delete().eq("id", organization.id);
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      console.log("User record created:", user.id);

      return NextResponse.json({
        success: true,
        organization: organization,
        user: user,
        message: "Organization and admin account created successfully",
      });
    } catch (error: any) {
      console.error("Organization/User creation error:", error);
      // If anything fails after auth user creation, clean up the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw error;
    }
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
