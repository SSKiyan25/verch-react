import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH() {
  try {
    const supabase = await createClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("Auth error or no user:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Update user's terms acceptance
    const { error: updateError } = await supabase
      .from("users")
      .update({
        has_agreed_to_terms: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user terms:", updateError);
      return NextResponse.json(
        { error: "Failed to update terms acceptance" },
        { status: 500 }
      );
    }

    console.log("Terms acceptance updated successfully for user:", user.id);

    return NextResponse.json(
      { message: "Terms accepted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in accept-terms API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
