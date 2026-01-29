import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { supplierSchema } from "@/lib/validations/supplier";
import { z } from "zod";

// --- GET SINGLE ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const { id: organizationId, supplierId } = await params;
  const supabase = await createClient();

  // Note: We usually allow fetching a single supplier even if archived,
  // so we don't filter by is_archived here.
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// --- UPDATE & RESTORE ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const { id: organizationId, supplierId } = await params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const json = await request.json();

    // 1. Extend Schema locally to allow 'is_archived' update
    // We do this because your main form schema might not include 'is_archived'
    const patchSchema = supplierSchema.partial().extend({
      is_archived: z.boolean().optional(),
    });

    const body = patchSchema.parse(json);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplierId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// --- ARCHIVE (Soft Delete) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const { id: organizationId, supplierId } = await params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // ✅ SOFT DELETE: Set is_archived to true
  const { error } = await supabase
    .from("suppliers")
    .update({ is_archived: true })
    .eq("id", supplierId)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Supplier archived successfully.",
  });
}
