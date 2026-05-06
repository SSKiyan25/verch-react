"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

interface OrderStatusTabsProps {
  currentStatus: string | undefined;
}

export function OrderStatusTabs({ currentStatus }: OrderStatusTabsProps) {
  const router = useRouter();

  const handleTabClick = (value: string | undefined) => {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    const query = params.toString();
    router.push(`/user/orders${query ? `?${query}` : ""}`);
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-2 min-w-max pb-1">
        {TABS.map((tab) => {
          const isActive = tab.value === currentStatus;
          return (
            <button
              key={tab.label}
              onClick={() => handleTabClick(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-[44px]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
