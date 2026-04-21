/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateSetupCompletion } from "@/lib/utils/org-setup-helpers";
import {
  invalidateOrganizationCache,
  invalidateOrgSettingsCache,
} from "@/lib/data/cache-helpers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/organizations/[id] - Get single organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/organizations/[id] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // Fetch current org data to calculate setup completion
    const { data: currentOrg, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentOrg) {
      throw new Error("Organization not found");
    }

    // Merge updates with current data for setup calculation
    const mergedData = { ...currentOrg, ...updates };

    // Auto-calculate and sync is_setup_complete
    const isSetupComplete = calculateSetupCompletion(mergedData);

    const { data, error } = await supabase
      .from("organizations")
      .update({
        ...updates,
        is_setup_complete: isSetupComplete,
        last_modified: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate caches to ensure UI updates
    invalidateOrganizationCache(id);
    invalidateOrgSettingsCache(id);

    return NextResponse.json({
      success: true,
      organization: data,
      message: "Organization updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/organizations/[id] - Delete organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
