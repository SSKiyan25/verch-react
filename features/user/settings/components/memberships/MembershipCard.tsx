"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, RefreshCw, Clock } from "lucide-react";
import type { UserMembership } from "@/lib/supabase/queries/user-settings";
import { refreshMembershipStatus } from "@/features/user/settings/actions/studentActions";

interface MembershipCardProps {
  membership: UserMembership;
  onWithdraw: () => void;
  onRefresh?: () => void;
}

const statusConfig: Record<
  UserMembership["membership_status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending Approval",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  active: {
    label: "Active Member",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  inactive: {
    label: "Inactive",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

const REFRESH_COOLDOWN_SECONDS = 15;

export function MembershipCard({
  membership,
  onWithdraw,
  onRefresh,
}: MembershipCardProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const config = statusConfig[membership.membership_status];

  const orgInitial =
    membership.organization_name?.charAt(0)?.toUpperCase() ?? "O";

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || cooldownRemaining > 0) return;

    setIsRefreshing(true);
    try {
      const result = await refreshMembershipStatus(membership.id);
      if (result.success) {
        onRefresh?.();
      }
    } finally {
      setIsRefreshing(false);
      // Start cooldown
      setCooldownRemaining(REFRESH_COOLDOWN_SECONDS);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current)
              clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isRefreshing, cooldownRemaining, membership.id, onRefresh]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start gap-3">
        {/* Org logo */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {membership.organization_logo_url ? (
            <Image
              src={membership.organization_logo_url}
              alt={membership.organization_name}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
              {orgInitial}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">
              {membership.organization_name}
            </h3>
            <Badge variant="secondary" className={config.className}>
              {config.label}
            </Badge>
          </div>

          {membership.academic_year && (
            <p className="text-sm text-muted-foreground">
              {membership.academic_year}
            </p>
          )}

          {membership.member_position && (
            <p className="text-sm text-muted-foreground">
              {membership.member_position}
            </p>
          )}

          {/* Show "Applied on" date for pending memberships */}
          {membership.membership_status === "pending" &&
            membership.created_at && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Applied on {formatDate(membership.created_at)}
              </p>
            )}

          {membership.reviewed_at &&
            membership.membership_status !== "pending" && (
              <p className="text-xs text-muted-foreground mt-1">
                Reviewed{" "}
                {new Date(membership.reviewed_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
        </div>

        {/* Refresh button for pending memberships */}
        {membership.membership_status === "pending" && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || cooldownRemaining > 0}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              cooldownRemaining > 0
                ? `Wait ${cooldownRemaining}s before refreshing`
                : "Check status"
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Cooldown indicator */}
      {membership.membership_status === "pending" && cooldownRemaining > 0 && (
        <p className="text-xs text-muted-foreground text-right -mt-2">
          Refresh again in {cooldownRemaining}s
        </p>
      )}

      {/* Rejection reason */}
      {membership.membership_status === "rejected" &&
        membership.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{membership.rejection_reason}</AlertDescription>
          </Alert>
        )}

      {/* Withdraw button for pending */}
      {membership.membership_status === "pending" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              Withdraw Application
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will withdraw your membership application to{" "}
                {membership.organization_name}. You can re-apply later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isWithdrawing}
                onClick={(e) => {
                  e.preventDefault();
                  setIsWithdrawing(true);
                  onWithdraw();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
