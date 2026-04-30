import { type Metadata } from "next";
import { PublicPageLayout } from "@/features/public/shared";
import { Mail, Shield, Scale, Linkedin, Facebook } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | Verch",
  description:
    "Get in touch with the Verch team. We're here to help with questions about orders, privacy, legal matters, and more.",
};

export default function ContactPage() {
  return (
    <PublicPageLayout
      title="Contact Us"
      subtitle="We'd love to hear from you."
    >
      {/* Email contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* General Inquiries */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">General Inquiries</h3>
          <p className="text-sm text-muted-foreground mb-4">
            For general questions about the platform or your orders
          </p>
          <a
            href="mailto:support@verch.com"
            className="text-primary hover:underline font-medium"
          >
            support@verch.com
          </a>
        </div>

        {/* Privacy Questions */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Privacy Questions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            For data, privacy, and account-related requests
          </p>
          <a
            href="mailto:privacy@verch.com"
            className="text-primary hover:underline font-medium"
          >
            privacy@verch.com
          </a>
        </div>

        {/* Legal */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Legal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            For questions about our Terms and Conditions
          </p>
          <a
            href="mailto:legal@verch.com"
            className="text-primary hover:underline font-medium"
          >
            legal@verch.com
          </a>
        </div>
      </div>

      {/* Follow Us section */}
      <section className="text-center p-8 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Follow Us</h2>
        <p className="text-muted-foreground mb-6">
          Stay connected with Verch on social media for updates, new
          organizations, and campus merch news.
        </p>
        <div className="flex items-center justify-center gap-6">
          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="h-6 w-6" />
            <span className="font-medium">Facebook</span>
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-6 w-6" />
            <span className="font-medium">LinkedIn</span>
          </a>
        </div>
      </section>
    </PublicPageLayout>
  );
}
