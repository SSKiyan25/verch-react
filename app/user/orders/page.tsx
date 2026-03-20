import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedUserOrders } from "@/lib/data/user/orders";
import { OrdersPageShell } from "@/features/user/orders/components/OrdersPageShell";
import { OrderCardSkeleton } from "@/features/user/orders/components/OrderCardSkeleton";
import type { OrderStatus } from "@/lib/supabase/queries/orders";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const PAGE_SIZE = 10;

interface OrdersPageProps {
  searchParams: Promise<{ status?: string; page?: string; placed?: string }>;
}

export default async function UserOrdersPage({
  searchParams,
}: OrdersPageProps) {
  const { status: rawStatus, page: rawPage, placed } = await searchParams;

  const status: OrderStatus | undefined =
    rawStatus && VALID_STATUSES.includes(rawStatus as OrderStatus)
      ? (rawStatus as OrderStatus)
      : undefined;

  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orders = await getCachedUserOrders(user.id, status, page, PAGE_SIZE);

  const totalCount = orders[0]?.total_count ?? 0;

  return (
    <Suspense
      fallback={
        <div className="container w-full py-6 px-4 sm:px-6 space-y-3">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      }
    >
      <OrdersPageShell
        orders={orders}
        totalCount={totalCount}
        currentPage={page}
        currentStatus={status}
        justPlaced={placed === "true"}
      />
    </Suspense>
  );
}
