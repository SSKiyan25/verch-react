import Image from "next/image";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";

type Props = {
  products: PublicProductListItem[];
};

export function HomepageHeroCollage({ products }: Props) {
  // Fallback to logo if insufficient products
  if (products.length < 2) {
    return (
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
    );
  }

  // Take first 6 products for 2x3 grid
  const displayProducts = products.slice(0, 6);

  return (
    <div className="hidden lg:flex justify-end">
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {displayProducts.map((product, index) => (
          <div
            key={product.id}
            className="relative aspect-square overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            {product.featured_photo_url ? (
              <Image
                src={product.featured_photo_url}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 0px, (max-width: 1024px) 0px, 200px"
                className="object-cover"
                priority={index < 4}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No Image</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
