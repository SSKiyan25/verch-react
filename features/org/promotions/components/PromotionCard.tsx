"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Play,
  Pause,
  Copy,
  Ticket,
  TrendingUp,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import type {
  OrgPromotionListItem,
  PromotionStatus,
} from "@/lib/types/org-promotions";
import { usePromotionStatus } from "../hooks/usePromotionStatus";
import { useDuplicatePromotion } from "../hooks/useDuplicatePromotion";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

type PromotionCardProps = {
  promotion: OrgPromotionListItem;
  orgId: string;
};

const STATUS_CONFIG: Record<
  PromotionStatus,
  {
    label: string;
    className: string;
    icon: typeof Eye;
    description: string;
  }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-200 text-slate-700",
    icon: EyeOff,
    description: "Not visible to customers",
  },
  active: {
    label: "Active",
    className: "bg-emerald-500 text-white",
    icon: Eye,
    description: "Visible to customers",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-500 text-white",
    icon: EyeOff,
    description: "Not visible to customers",
  },
  expired: {
    label: "Expired",
    className: "bg-slate-400 text-white",
    icon: EyeOff,
    description: "Promotion period ended",
  },
  exhausted: {
    label: "Exhausted",
    className: "bg-red-500 text-white",
    icon: EyeOff,
    description: "Usage limit reached",
  },
};

export function PromotionCard({ promotion, orgId }: PromotionCardProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    activate,
    pause,
    canActivate,
    canPause,
    isPending: statusPending,
  } = usePromotionStatus({
    orgId,
    promotionId: promotion.id,
    currentStatus: promotion.status,
    promotionName: promotion.name,
  });

  const { duplicate, isPending: duplicatePending } = useDuplicatePromotion({
    orgId,
  });

  const isPending = statusPending || duplicatePending;

  const statusConfig = STATUS_CONFIG[promotion.status];

  const formatDiscount = () => {
    if (promotion.discount_type === "percentage") {
      return `${promotion.discount_value}% off`;
    } else if (promotion.discount_type === "fixed") {
      return `₱${promotion.discount_value} off`;
    } else {
      return "Free item";
    }
  };

  const handleEdit = () => {
    router.push(`/org/promotions/${promotion.id}/edit`);
  };

  const handleActivate = async () => {
    setDropdownOpen(false);
    await activate();
  };

  const handlePause = async () => {
    setDropdownOpen(false);
    await pause();
  };

  const handleDuplicate = async () => {
    setDropdownOpen(false);
    await duplicate(promotion.id, `${promotion.name} (Copy)`);
  };

  const StatusIcon = statusConfig.icon;
  const isDraftOrInactive = ["draft", "paused"].includes(promotion.status);

  return (
    <Card
      className={`group relative overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full ${
        isDraftOrInactive
          ? "border-amber-300 bg-amber-50/30"
          : "border-slate-200"
      }`}
    >
      {/* Draft/Inactive Alert Banner */}
      {isDraftOrInactive && (
        <Alert className="border-0 border-b border-amber-200 bg-amber-50 rounded-none py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 flex items-center justify-between gap-2">
            <span className="font-medium">
              {promotion.status === "draft"
                ? "Not visible to customers"
                : "Currently paused"}
            </span>
            {canActivate && (
              <Button
                size="sm"
                variant="default"
                className="h-6 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleActivate}
                disabled={isPending}
              >
                <Play className="h-3 w-3 mr-1" />
                Activate
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <CardHeader className={promotion.description ? "pb-3" : "pb-0"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">
              {promotion.name}
            </h3>
            {promotion.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {promotion.description}
              </p>
            )}
          </div>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                disabled={isPending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {canActivate && (
                <DropdownMenuItem onClick={handleActivate}>
                  <Play className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {canPause && (
                <DropdownMenuItem onClick={handlePause}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Status & Trigger Type */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={`${statusConfig.className} text-xs px-2 py-0.5 flex items-center gap-1`}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
          {promotion.trigger_type === "voucher_code" && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              <Ticket className="w-3 h-3 mr-1" />
              {promotion.voucher_code}
            </Badge>
          )}
          {promotion.trigger_type === "auto" && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Auto-apply
            </Badge>
          )}
        </div>

        {/* Status description */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span
            className={isDraftOrInactive ? "text-amber-700 font-medium" : ""}
          >
            {statusConfig.description}
          </span>
        </p>

        {/* Discount */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="font-medium text-emerald-700">
            {formatDiscount()}
          </span>
        </div>

        {/* Date Range */}
        {(promotion.starts_at || promotion.ends_at) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">
              {promotion.starts_at &&
                format(new Date(promotion.starts_at), "MMM d, yyyy")}
              {promotion.starts_at && promotion.ends_at && " - "}
              {promotion.ends_at &&
                format(new Date(promotion.ends_at), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Usage Stats */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {promotion.total_uses_count} / {promotion.total_uses_cap ?? "∞"}{" "}
              uses
            </span>
            {promotion.total_uses_cap && (
              <span>
                {Math.round(
                  (promotion.total_uses_count / promotion.total_uses_cap) * 100,
                )}
                %
              </span>
            )}
          </div>
          {promotion.total_uses_cap && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((promotion.total_uses_count / promotion.total_uses_cap) * 100, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
