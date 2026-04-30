/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/utils/email"; // The sender
import { getVerificationEmailHtml } from "@/lib/utils/email-template"; // The template

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("❌ Missing email configuration:", {
        hasUser: !!process.env.GMAIL_USER,
        hasPassword: !!process.env.GMAIL_APP_PASSWORD,
      });
      return NextResponse.json(
        { error: "Email service not configured. Please contact support." },
        { status: 503 },
      );
    }

    const { email, type = "organization_verification" } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
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
      console.error("❌ Database error:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // ✅ SEND EMAIL (Clean & Readable)
    const emailResult = await sendEmail({
      to: email,
      subject: "Your Verification Code - Verch",
      html: getVerificationEmailHtml(verificationCode),
    });

    if (!emailResult.success) {
      console.error("❌ Email send failed:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error: any) {
    // Log the actual error for debugging
    console.error("❌ Send verification error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        // In development, include error details
        ...(process.env.NODE_ENV === "development" && {
          details: error?.message,
        }),
      },
      { status: 500 },
    );
  }
}
