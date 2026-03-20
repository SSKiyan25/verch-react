"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { OrderDetail } from "@/lib/supabase/queries/orders";

interface OrderStatusTimelineProps {
  order: Pick<
    OrderDetail,
    "status" | "cancelled_at" | "cancellation_reason" | "created_at"
  >;
}

const STEPS = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
] as const;

const STATUS_STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 0, // cancelled while still pending
};

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  const isCancelled = order.status === "cancelled";
  // For cancelled orders, use the last active step index (always 0 for customer-cancellable)
  const activeStepIndex = STATUS_STEP_INDEX[order.status] ?? 0;

  return (
    <div className="py-4">
      {/* Horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeStepIndex;
          const isActive = idx === activeStepIndex && !isCancelled;
          const isFuture = idx > activeStepIndex;
          const isLastCompletedBeforeCancel =
            isCancelled && idx === activeStepIndex;

          return (
            <div
              key={step.key}
              className="flex sm:flex-col sm:flex-1 sm:items-center gap-3 sm:gap-0"
            >
              {/* Step indicator */}
              <div className="flex sm:flex-col sm:items-center sm:w-full">
                {/* Connector line — left side (before step) */}
                <div
                  className={cn(
                    "hidden sm:block h-0.5 flex-1",
                    idx === 0 ? "invisible" : "",
                    isCompleted || isActive ? "bg-primary" : "bg-muted",
                  )}
                />

                {/* Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full shrink-0 z-10",
                    isCompleted
                      ? "w-7 h-7 bg-primary text-primary-foreground"
                      : isActive
                        ? "w-7 h-7 bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                        : isLastCompletedBeforeCancel
                          ? "w-7 h-7 bg-destructive text-destructive-foreground"
                          : "w-7 h-7 bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isLastCompletedBeforeCancel ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>

                {/* Connector line — right side (after step) */}
                <div
                  className={cn(
                    "hidden sm:block h-0.5 flex-1",
                    idx === STEPS.length - 1 ? "invisible" : "",
                    isCompleted ? "bg-primary" : "bg-muted",
                  )}
                />

                {/* Vertical connector (mobile) */}
                <div
                  className={cn(
                    "sm:hidden w-0.5 flex-1 min-h-[1.5rem] ml-3.5",
                    idx === STEPS.length - 1 ? "invisible" : "",
                    isCompleted ? "bg-primary" : "bg-muted",
                  )}
                />
              </div>

              {/* Label */}
              <div className="sm:text-center pt-1 sm:pt-2 min-w-0 flex-1 sm:flex-none">
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCompleted || isActive
                      ? "text-foreground"
                      : isLastCompletedBeforeCancel
                        ? "text-destructive"
                        : isFuture
                          ? "text-muted-foreground"
                          : "text-muted-foreground",
                  )}
                >
                  {isLastCompletedBeforeCancel ? "Cancelled" : step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancellation reason */}
      {isCancelled && order.cancellation_reason && (
        <p className="mt-3 text-xs text-destructive/80 bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          Reason: {order.cancellation_reason}
        </p>
      )}
    </div>
  );
}
