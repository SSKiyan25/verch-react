import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateCache, CACHE_KEYS, getTag } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, avatar_url } = body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create new user with Google data (NO EMAIL FIELD)
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        // email field removed - not in schema
        full_name: full_name || user.user_metadata?.full_name || "User",
        avatar_url: avatar_url || user.user_metadata?.avatar_url || null,
        role: "customer", // Google users are always customers
        is_verified: true, // Google users are auto-verified
        has_agreed_to_terms: false, // Must accept terms
        organization_id: null, // Customers don't belong to organizations
      })
      .select()
      .single();

    if (insertError) {
      console.error("User creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Invalidate cache for new user
    invalidateCache(getTag(CACHE_KEYS.users.byId(newUser.id)));

    return NextResponse.json({
      success: true,
      data: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
