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

    const organizationData = {
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
      is_setup_complete: true,
      is_verified: formData.isVerified || false,
      verification: formData.isVerified
        ? {
            verifiedAt: new Date().toISOString(),
            verifiedBy: "email_verification",
          }
        : {},
    };

    const { data, error } = await supabase
      .from("organizations")
      .insert([organizationData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      organization: data,
      message: "Organization created successfully",
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
