"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  pending: "No pending orders",
  confirmed: "No confirmed orders",
  preparing: "No orders being prepared",
  ready: "No orders ready for pickup",
  completed: "No completed orders",
  cancelled: "No cancelled orders",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: "Orders waiting for payment or confirmation will appear here.",
  confirmed: "Orders confirmed by sellers will appear here.",
  preparing: "Orders being prepared will appear here.",
  ready: "Orders ready for pickup or delivery will appear here.",
  completed: "Your completed orders will appear here.",
  cancelled: "Your cancelled orders will appear here.",
};

interface EmptyOrdersProps {
  status: string | undefined;
}

export function EmptyOrders({ status }: EmptyOrdersProps) {
  const title = status
    ? (STATUS_LABELS[status] ?? "No orders found")
    : "You haven't placed any orders yet";

  const description = status
    ? (STATUS_DESCRIPTIONS[status] ?? "No orders match this filter.")
    : "When you place an order, it will appear here.";

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6 animate-in fade-in duration-500">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        {description}
      </p>
      <Button asChild variant="default" size="default" className="min-h-[44px]">
        <Link href="/stores">Browse Stores</Link>
      </Button>
    </div>
  );
}
