import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Store, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Welcome to <span className="text-primary">Verch</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl">
                Your official e-commerce platform for Visayas State University
                student organization merchandise. Discover unique products from
                your favorite student orgs!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Browse Products
                </Link>
                <Link
                  href="/stores"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  <Store className="mr-2 h-5 w-5" />
                  View Stores
                </Link>
              </div>
            </div>

            {/* Right Image/Logo */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-primary/20 rounded-full flex items-center justify-center">
                  <Image
                    src="/logo-verch-2.png"
                    alt="Verch Logo"
                    width={200}
                    height={200}
                    className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4">
              Why Choose Verch?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Supporting VSU student organizations through quality merchandise
              and seamless shopping experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Student Organizations
              </h3>
              <p className="text-muted-foreground">
                Supporting VSU student orgs by providing a platform to showcase
                and sell their merchandise.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Products</h3>
              <p className="text-muted-foreground">
                Discover unique and high-quality merchandise from various
                student organizations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Shopping</h3>
              <p className="text-muted-foreground">
                Simple and secure shopping experience with multiple organization
                stores in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join the Verch community and support your favorite VSU student
            organizations today!
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary bg-primary-foreground rounded-lg hover:bg-primary-foreground/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
