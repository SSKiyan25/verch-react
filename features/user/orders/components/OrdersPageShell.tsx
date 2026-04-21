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
    <div className="container max-w-5xl w-full py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage all your orders in one place
        </p>
      </div>

      {/* Just-placed banner */}
      {justPlaced && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3.5 text-sm text-blue-900 shadow-sm dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <Loader2 className="h-5 w-5 animate-spin mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Order placed successfully!</p>
            <p className="text-xs mt-1 opacity-90">
              Your order is being processed. It may take a few moments to appear
              below.
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
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.order_id} order={order} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={!hasPrevPage}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!hasNextPage}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
