/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/utils/email"; // The sender
import { getVerificationEmailHtml } from "@/lib/utils/email-template"; // The template

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, type = "organization_verification" } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store in DB
    const { error: dbError } = await supabase
      .from("verification_codes")
      .insert({
        email,
        code: verificationCode,
        type,
        expires_at: expiresAt,
        used: false,
      });

    if (dbError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // ✅ SEND EMAIL (Clean & Readable)
    const emailResult = await sendEmail({
      to: email,
      subject: "Your Verification Code - Verch",
      html: getVerificationEmailHtml(verificationCode),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
