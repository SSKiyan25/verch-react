/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { supplierSchema } from "@/lib/validations/supplier";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ Check Query Params for "?archived=true"
  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archived") === "true";

  // Start building the query
  let query = supabase
    .from("suppliers")
    .select("*, products(count)")
    .eq("organization_id", organizationId);

  // ✅ Apply Filter: Show Archived OR Show Active (Default)
  if (showArchived) {
    query = query.eq("is_archived", true);
  } else {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedData = data.map((supplier) => ({
    ...supplier,
    product_count: supplier.products?.[0]?.count || 0,
    products: undefined,
  }));

  return NextResponse.json({ data: formattedData });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const json = await request.json();
    const body = supplierSchema.parse(json); // Ensure your Schema allows defaults

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        ...body,
        organization_id: organizationId,
        is_archived: false, // Explicitly set to false on create
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
