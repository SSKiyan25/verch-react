import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedCartItems } from "@/lib/data/cart";
import { getCachedUserAddresses } from "@/lib/data/user-customer";
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

  console.log("Cart summary:", cartSummary);
  return (
    <Suspense fallback={<CartPageSkeleton />}>
      <CartPageClient
        initialCart={cartSummary}
        addresses={addresses}
        userId={user!.id}
      />
    </Suspense>
  );
}
