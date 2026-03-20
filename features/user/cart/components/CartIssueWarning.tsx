"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IssueType = "price_changed" | "unavailable" | "over_stock";

interface CartIssueWarningProps {
  type: IssueType;
  message: string;
  onDismiss?: () => void;
}

export function CartIssueWarning({
  type,
  message,
  onDismiss,
}: CartIssueWarningProps) {
  const isError = type === "unavailable";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {isError ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      {type === "price_changed" && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-0.5 text-xs"
          onClick={onDismiss}
        >
          Got it
        </Button>
      )}
    </div>
  );
}
