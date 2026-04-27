"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { batchUpdateOrderStatusAction } from "@/features/org/orders/actions/batchUpdateOrderStatusAction";
import type { BatchAction } from "@/features/org/orders/hooks/useOrderSelection";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";

type Props = {
  selectedOrders: OrgOrderListItem[];
  batchAction: BatchAction | null;
  onClearSelection: () => void;
};

export function OrgBatchActionBar({
  selectedOrders,
  batchAction,
  onClearSelection,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  const count = selectedOrders.length;

  if (count === 0) return null;

  async function handleBatchAction() {
    if (!batchAction) return;

    const orderIds = selectedOrders.map((o) => o.id);

    startTransition(async () => {
      setProgress(`0 of ${count} updated…`);

      const result = await batchUpdateOrderStatusAction({
        orderIds,
        newStatus: batchAction.nextStatus as "preparing" | "ready",
      });

      setProgress(null);

      if (!result.success) {
        toast.error(result.error ?? "Batch update failed.");
        router.refresh();
        return;
      }

      const { succeeded, failed } = result.data!;

      if (failed.length === 0) {
        toast.success(
          `${succeeded.length} ${succeeded.length === 1 ? "order" : "orders"} updated to ${batchAction.label.replace("Mark ", "").toLowerCase()}.`,
        );
      } else {
        toast.warning(
          `${succeeded.length} updated, ${failed.length} failed. Check failed orders and retry.`,
        );
      }

      onClearSelection();
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2",
        "rounded-2xl border border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "shadow-2xl shadow-black/10 dark:shadow-black/40",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
      )}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#D4AF37] sm:mt-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {count} {count === 1 ? "order" : "orders"} selected
              </p>
              <Badge
                variant="outline"
                className="border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[11px] font-medium text-foreground"
              >
                Batch mode
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Apply one shared status update to the current selection.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {batchAction ? (
            <Button
              size="sm"
              onClick={handleBatchAction}
              disabled={isPending}
              className="h-9 gap-2 rounded-xl px-4 cursor-pointer transition-colors duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progress ?? "Updating…"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {batchAction.label}
                </>
              )}
            </Button>
          ) : (
            <div className="flex h-9 items-center gap-2 rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              No common action available
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-xl p-0 cursor-pointer transition-colors duration-200"
            onClick={onClearSelection}
            disabled={isPending}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
