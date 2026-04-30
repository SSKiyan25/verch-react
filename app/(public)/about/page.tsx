import { type Metadata } from "next";
import { PublicPageLayout } from "@/features/public/shared";
import { HowItWorksStep } from "@/features/public/about";
import { Store, ShoppingBag, Truck, Shield, Zap, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Verch",
  description:
    "Learn about Verch, the merch platform built for VSU student organizations. Discover how we connect students with the merchandise they love.",
};

export default function AboutPage() {
  return (
    <PublicPageLayout
      title="About Us"
      subtitle="The merch platform built for VSU student organizations."
    >
      {/* Our Mission */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-lg leading-relaxed">
          Verch exists to connect VSU students with the merchandise of the
          organizations they care about, making it easy for orgs to sell and
          students to shop in one place. We believe every student organization
          deserves a professional platform to showcase their brand and generate
          revenue through merchandise, while students deserve a seamless
          shopping experience that celebrates campus life.
        </p>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <HowItWorksStep
            icon={Store}
            step={1}
            title="Orgs Set Up Their Store"
            description="Student organizations create their digital storefront, upload products, and manage inventory—all in one simple dashboard."
          />
          <HowItWorksStep
            icon={ShoppingBag}
            step={2}
            title="Students Browse and Order"
            description="Students discover exclusive org merch, add items to their cart, and complete secure checkout with ease."
          />
          <HowItWorksStep
            icon={Truck}
            step={3}
            title="Orgs Fulfill and Deliver"
            description="Organizations receive orders, verify payments (cash on hand or GCash), and coordinate delivery directly to students on campus."
          />
        </div>
      </section>

      {/* Why Verch */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Why Verch</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Exclusive Org Merch
                </h3>
                <p className="text-muted-foreground">
                  Access merchandise from all your favorite VSU student
                  organizations in one convenient marketplace.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Flexible Payments
                </h3>
                <p className="text-muted-foreground">
                  Pay with cash on hand or GCash—all payments are manually
                  verified by organizations to ensure secure transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Easy Store Setup</h3>
                <p className="text-muted-foreground">
                  Organizations can launch their store in minutes with our
                  intuitive dashboard and management tools.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  VSU-Focused Platform
                </h3>
                <p className="text-muted-foreground">
                  Built exclusively for the VSU community, ensuring every
                  feature serves student organizations and their members.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact prompt */}
      <section className="text-center p-8 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Questions?</h2>
        <p className="text-lg text-muted-foreground mb-4">
          We&apos;d love to hear from you. Whether you&apos;re a student
          organization interested in setting up a store or a student with
          questions about ordering, we&apos;re here to help.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get in Touch
        </Link>
      </section>
    </PublicPageLayout>
  );
}
