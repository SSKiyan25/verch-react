import { type Metadata } from "next";
import { PublicPageLayout } from "@/features/public/shared";

export const metadata: Metadata = {
  title: "Terms and Conditions | Verch",
  description:
    "Read the Terms and Conditions for using the Verch platform. Learn about user accounts, platform usage, orders, payments, and more.",
};

export default function TermsPage() {
  return (
    <PublicPageLayout
      title="Terms and Conditions"
      subtitle="Effective Date: January 5, 2026"
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using the Verch platform, you agree to be bound by
          these Terms and Conditions and all applicable laws and regulations.
        </p>

        <h2>2. User Accounts</h2>
        <ul>
          <li>
            You must provide accurate and complete information when creating an
            account
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your
            account credentials
          </li>
          <li>
            You must notify us immediately of any unauthorized use of your
            account
          </li>
        </ul>

        <h2>3. Platform Usage</h2>
        <ul>
          <li>The platform is intended for VSU students and organizations</li>
          <li>
            Users must not engage in fraudulent, abusive, or illegal activities
          </li>
          <li>Organizations must provide authentic merchandise and services</li>
        </ul>

        <h2>4. Orders and Payments</h2>
        <ul>
          <li>All orders are subject to availability and confirmation</li>
          <li>
            Payments are accepted via cash on hand or GCash and are manually
            verified by individual organizations
          </li>
          <li>Refund policies are determined by individual organizations</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <ul>
          <li>
            The Verch platform and its content are protected by intellectual
            property laws
          </li>
          <li>
            Organizations retain rights to their own content and merchandise
          </li>
          <li>
            Users may not reproduce or distribute platform content without
            permission
          </li>
        </ul>

        <h2>6. Limitation of Liability</h2>
        <p>
          Verch is not liable for any indirect, incidental, or consequential
          damages arising from platform use.
        </p>

        <h2>7. Modifications</h2>
        <p>
          We reserve the right to modify these terms at any time. Users will be
          notified of significant changes.
        </p>

        <h2>8. Contact Information</h2>
        <p>
          For questions about these terms, please contact us at{" "}
          <a href="mailto:legal@verch.com">legal@verch.com</a>.
        </p>
      </article>
    </PublicPageLayout>
  );
}
