"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderStatusTabs } from "@/features/user/orders/components/OrderStatusTabs";
import { OrderCard } from "@/features/user/orders/components/OrderCard";
import { EmptyOrders } from "@/features/user/orders/components/EmptyOrders";
import { useOrdersPagination } from "@/features/user/orders/hooks/useOrdersPagination";
import type { UserOrderListItem } from "@/lib/supabase/queries/orders";

const PAGE_SIZE = 10;

interface OrdersPageShellProps {
  orders: UserOrderListItem[];
  totalCount: number;
  currentPage: number;
  currentStatus: string | undefined;
  justPlaced?: boolean;
}

export function OrdersPageShell({
  orders,
  totalCount,
  currentPage,
  currentStatus,
  justPlaced,
}: OrdersPageShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (searchParams.get("placed") === "true") {
      toast.success("Order placed!", {
        description:
          "We're loading your order — it may take a moment to appear.",
        duration: 6000,
      });
      router.replace("/user/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { totalPages, hasNextPage, hasPrevPage, goToNextPage, goToPrevPage } =
    useOrdersPagination({
      currentPage,
      currentStatus,
      totalCount,
      pageSize: PAGE_SIZE,
    });

  return (
    <div className="container w-full py-6 px-4 sm:px-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage your orders
        </p>
      </div>

      {/* Just-placed banner */}
      {justPlaced && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Your order was placed successfully!</p>
            <p className="text-xs mt-0.5 opacity-80">
              It may take a few seconds to appear below. The page will show your
              latest orders shortly.
            </p>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <OrderStatusTabs currentStatus={currentStatus} />

      {/* Order list */}
      {orders.length === 0 ? (
        <EmptyOrders status={currentStatus} />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.order_id} order={order} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
