import nodemailer from "nodemailer";

// 1. Setup the Transporter (Do this once)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

// 2. Generic Send Function
export const sendEmail = async (data: EmailPayload) => {
  const { to, subject, html } = data;
  console.log("📧 Email User:", process.env.GMAIL_USER);
  console.log("🔑 Password Length:", process.env.GMAIL_APP_PASSWORD?.length);
  try {
    const info = await transporter.sendMail({
      from: `"Verch Store" <${process.env.GMAIL_USER}>`, // Centralized Sender Name
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email failed:", error);
    return { success: false, error };
  }
};
