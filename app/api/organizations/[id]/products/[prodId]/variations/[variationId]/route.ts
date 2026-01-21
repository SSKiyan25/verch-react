/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; prodId: string; variationId: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: variation, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("id", params.variationId)
      .eq("product_id", params.prodId)
      .single();

    if (error || !variation) {
      return NextResponse.json(
        { error: "Variation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: variation });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; prodId: string; variationId: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", params.variationId)
      .eq("product_id", params.prodId);

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to delete variation",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Variation deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
