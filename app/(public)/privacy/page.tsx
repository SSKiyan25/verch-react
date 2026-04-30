import { type Metadata } from "next";
import { PublicPageLayout } from "@/features/public/shared";

export const metadata: Metadata = {
  title: "Privacy Policy | Verch",
  description:
    "Learn about how Verch collects, uses, and protects your personal information. Our commitment to your privacy and data security.",
};

export default function PrivacyPage() {
  return (
    <PublicPageLayout
      title="Privacy Policy"
      subtitle="Effective Date: January 5, 2026"
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>1. Information We Collect</h2>

        <h3>Personal Information</h3>
        <ul>
          <li>Name, email address, and contact information</li>
          <li>University identification and verification details</li>
          <li>Payment information (GCash details when provided)</li>
        </ul>

        <h3>Usage Information</h3>
        <ul>
          <li>Platform activity and preferences</li>
          <li>Device and browser information</li>
          <li>Location data (if permitted)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and improve our services</li>
          <li>To facilitate order processing and payment verification</li>
          <li>To communicate with users about orders and updates</li>
          <li>To ensure platform security and prevent fraud</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell or rent your personal information. We may share data
          with:
        </p>
        <ul>
          <li>
            VSU organizations for order fulfillment and payment verification
          </li>
          <li>
            Service providers who assist in platform operations (e.g.,
            Cloudflare for security and performance)
          </li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your
          information, including:
        </p>
        <ul>
          <li>Encryption of sensitive data</li>
          <li>Secure server infrastructure</li>
          <li>Regular security audits and updates</li>
        </ul>

        <h2>5. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Request corrections to inaccurate data</li>
          <li>Delete your account and associated data</li>
          <li>Opt out of marketing communications</li>
          <li>Request a copy of your data</li>
        </ul>

        <h2>6. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Remember your preferences</li>
          <li>Analyze platform usage</li>
          <li>Provide personalized experiences</li>
        </ul>

        <h2>7. Third-Party Services</h2>
        <p>
          Our platform uses Cloudflare (free tier) for security, performance
          optimization, and DDoS protection. We may also integrate with other
          third-party services. Please review their privacy policies for
          information about their data practices.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          For privacy-related questions, contact us at{" "}
          <a href="mailto:privacy@verch.com">privacy@verch.com</a>.
        </p>
      </article>
    </PublicPageLayout>
  );
}
