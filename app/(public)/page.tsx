import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import {
  getCachedHomepageProducts,
  getCachedHomepageStores,
} from "@/lib/data/public/homepage";
import { getCachedProductsPromotions } from "@/lib/data/public/promotions";
import {
  HomepageHeroCollage,
  HomepageFeaturedProducts,
  HomepageFeaturedStores,
} from "@/features/public/homepage";

export default async function Home() {
  // Fetch data for hero collage and featured sections
  const [{ products }, { stores }] = await Promise.all([
    getCachedHomepageProducts(),
    getCachedHomepageStores(),
  ]);

  // Fetch promotions for all products
  const productIds = products.map((p) => p.id);
  const promotionsMap =
    productIds.length > 0
      ? await getCachedProductsPromotions(productIds)
      : new Map();

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-10 sm:py-16">
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

            {/* Right Image/Product Collage */}
            <HomepageHeroCollage products={products} />
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <HomepageFeaturedProducts
        products={products}
        promotionsMap={promotionsMap}
      />

      {/* Featured Stores Section */}
      <HomepageFeaturedStores stores={stores} />

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Support your org. Shop their merch.
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Browse exclusive merchandise from your favorite VSU student
            organizations.
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