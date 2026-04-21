import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedCartItems } from "@/lib/data/cart";
import { getCachedUserAddresses } from "@/lib/data/user-customer";
import { getCachedProductsPromotions } from "@/lib/data/public/promotions";
import { CartPageClient } from "@/features/user/cart/components/CartPageClient";
import { CartPageSkeleton } from "@/features/user/cart/components/CartPageSkeleton";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [cartSummary, addresses] = await Promise.all([
    getCachedCartItems(user!.id),
    getCachedUserAddresses(user!.id),
  ]);

  // Fetch promotions for all products in cart (batch query for performance)
  const productIds = cartSummary.orgs.flatMap((org) =>
    org.standalone_items.map((item) => item.product_id),
  );
  const promotionsMap =
    productIds.length > 0
      ? await getCachedProductsPromotions(productIds, user!.id)
      : new Map();

  console.log("Cart summary:", cartSummary);
  console.log("Cart promotions:", promotionsMap);

  return (
    <Suspense fallback={<CartPageSkeleton />}>
      <CartPageClient
        initialCart={cartSummary}
        addresses={addresses}
        userId={user!.id}
        promotionsMap={promotionsMap}
      />
    </Suspense>
  );
}
