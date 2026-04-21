"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Edit,
  Pause,
  Play,
  Ticket,
  TrendingUp,
  Users,
  Package,
  Building2,
  Clock,
  User,
  Target,
  Gift,
  Shield,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type {
  OrgPromotionDetail,
  PromotionStatus,
} from "@/lib/types/org-promotions";
import { usePromotionStatus } from "../hooks/usePromotionStatus";
import { useDuplicatePromotion } from "../hooks/useDuplicatePromotion";
import { ConfirmDialog } from "./ConfirmDialog";
import { DuplicatePromotionDialog } from "./DuplicatePromotionDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PromotionDetailProps = {
  promotion: OrgPromotionDetail;
  orgId: string;
};

const STATUS_CONFIG: Record<
  PromotionStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-200 text-slate-700",
    icon: <Edit className="w-3 h-3" />,
  },
  active: {
    label: "Active",
    className: "bg-emerald-500 text-white",
    icon: <Play className="w-3 h-3" />,
  },
  paused: {
    label: "Paused",
    className: "bg-amber-500 text-white",
    icon: <Pause className="w-3 h-3" />,
  },
  expired: {
    label: "Expired",
    className: "bg-slate-400 text-white",
    icon: <Clock className="w-3 h-3" />,
  },
  exhausted: {
    label: "Exhausted",
    className: "bg-red-500 text-white",
    icon: <Users className="w-3 h-3" />,
  },
};

export function PromotionDetail({ promotion, orgId }: PromotionDetailProps) {
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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

  const { isPending: duplicatePending } = useDuplicatePromotion({
    orgId,
  });

  const isPending = statusPending || duplicatePending;
  const statusConfig = STATUS_CONFIG[promotion.status];
  const isReadOnly =
    promotion.status === "expired" || promotion.status === "exhausted";

  const formatDiscount = () => {
    if (promotion.discount_type === "percentage") {
      return `${promotion.discount_value}% off`;
    } else if (promotion.discount_type === "fixed") {
      return `₱${promotion.discount_value?.toFixed(2)} off`;
    } else {
      return "Free item";
    }
  };

  const handleActivate = async () => {
    await activate();
    setShowActivateDialog(false);
  };

  const handlePause = async () => {
    await pause();
    setShowPauseDialog(false);
  };

  const usagePercentage = promotion.total_uses_cap
    ? Math.round((promotion.total_uses_count / promotion.total_uses_cap) * 100)
    : 0;

  const isDraftOrInactive = ['draft', 'paused'].includes(promotion.status);

  return (
    <>
      <div className="space-y-6">
        {/* Inactive Alert - Show prominently at the top */}
        {isDraftOrInactive && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">
              {promotion.status === 'draft' 
                ? 'This promotion is not visible to customers' 
                : 'This promotion is currently paused'}
            </AlertTitle>
            <AlertDescription className="text-amber-800 mt-2">
              <div className="flex items-start gap-3">
                <EyeOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="mb-3">
                    {promotion.status === 'draft' 
                      ? 'Customers cannot see or use this promotion. Activate it to make it available on product pages and at checkout.'
                      : 'This promotion is temporarily paused and not shown to customers. Activate it to resume visibility.'}
                  </p>
                  {canActivate && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => setShowActivateDialog(true)}
                      disabled={isPending}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Activate Promotion
                    </Button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link href="/org/promotions">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Promotions
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {promotion.name}
            </h1>
            {promotion.description && (
              <p className="text-muted-foreground">{promotion.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canActivate && !isReadOnly && (
              <Button
                onClick={() => setShowActivateDialog(true)}
                disabled={isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
            {canPause && (
              <Button
                onClick={() => setShowPauseDialog(true)}
                variant="outline"
                disabled={isPending}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            {!isReadOnly && (
              <Button variant="outline" asChild>
                <Link href={`/org/promotions/${promotion.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowDuplicateDialog(true)}
              disabled={isPending}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
          </div>
        </div>

        {/* Status & Quick Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  className={`${statusConfig.className} flex items-center gap-1`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                {promotion.trigger_type === "voucher_code" ? (
                  <>
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {promotion.voucher_code}
                    </span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Auto-applied</span>
                  </>
                )}
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">
                  {formatDiscount()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Discount Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Discount Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Discount Type</p>
                  <p className="font-medium capitalize">
                    {promotion.discount_type.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Discount Value
                  </p>
                  <p className="font-medium">{formatDiscount()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Type</p>
                  <p className="font-medium capitalize">
                    {promotion.target_type === "product"
                      ? "Specific Products"
                      : promotion.target_type === "organization"
                        ? "Specific Organizations"
                        : "Entire Order"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Minimum Order Amount
                  </p>
                  <p className="font-medium">
                    ₱{promotion.minimum_order_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Gift Item */}
              {promotion.discount_type === "free_item" &&
                promotion.gift_item && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Gift Item
                      </p>
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="font-medium">
                          {promotion.gift_item.product_name}
                        </p>
                        {promotion.gift_item.variation_name && (
                          <p className="text-sm text-muted-foreground">
                            {promotion.gift_item.variation_name}
                          </p>
                        )}
                        <p className="text-sm">
                          Quantity: {promotion.gift_item.quantity}
                        </p>
                      </div>
                    </div>
                  </>
                )}
            </CardContent>
          </Card>

          {/* Usage & Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usage & Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Uses</p>
                  <p className="font-medium">
                    {promotion.total_uses_count} /{" "}
                    {promotion.total_uses_cap ?? "∞"}
                  </p>
                </div>
                {promotion.total_uses_cap && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Start Date
                  </p>
                  <p className="font-medium">
                    {promotion.starts_at
                      ? format(
                          new Date(promotion.starts_at),
                          "MMM d, yyyy h:mm a",
                        )
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    End Date
                  </p>
                  <p className="font-medium">
                    {promotion.ends_at
                      ? format(
                          new Date(promotion.ends_at),
                          "MMM d, yyyy h:mm a",
                        )
                      : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targets */}
          {promotion.targets.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {promotion.target_type === "product" ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                  {promotion.target_type === "product"
                    ? "Target Products"
                    : "Target Organizations"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {promotion.targets.map((target) => (
                    <div
                      key={target.id}
                      className="bg-muted/50 p-3 rounded-md border"
                    >
                      <p className="font-medium">
                        {target.product_name || target.organization_name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eligibility Rules */}
          {promotion.eligibility_rules.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Eligibility Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {promotion.eligibility_rules.map((rule) => (
                    <Badge key={rule.id} variant="outline">
                      {rule.rule_type === "verified_student"
                        ? "Verified Student Only"
                        : "Active Organization Member"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">
                    {promotion.created_by_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {format(
                      new Date(promotion.created_at),
                      "MMM d, yyyy h:mm a",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {format(
                      new Date(promotion.updated_at),
                      "MMM d, yyyy h:mm a",
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        onConfirm={handleActivate}
        isPending={statusPending}
        title="Activate Promotion"
        description={`Are you sure you want to activate "${promotion.name}"? It will become available to customers immediately.`}
        confirmLabel="Activate"
      />

      <ConfirmDialog
        open={showPauseDialog}
        onOpenChange={setShowPauseDialog}
        onConfirm={handlePause}
        isPending={statusPending}
        title="Pause Promotion"
        description={`Are you sure you want to pause "${promotion.name}"? Customers will not be able to use it until you activate it again.`}
        confirmLabel="Pause"
        variant="destructive"
      />

      <DuplicatePromotionDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        orgId={orgId}
        promotionId={promotion.id}
        currentName={promotion.name}
      />
    </>
  );
}
