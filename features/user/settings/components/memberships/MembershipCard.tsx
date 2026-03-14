"use client";

import { useState } from "react";
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
import { AlertCircle } from "lucide-react";
import type { UserMembership } from "@/lib/supabase/queries/user-settings";

interface MembershipCardProps {
  membership: UserMembership;
  onWithdraw: () => void;
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

export function MembershipCard({
  membership,
  onWithdraw,
}: MembershipCardProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const config = statusConfig[membership.membership_status];

  const orgInitial =
    membership.organization_name?.charAt(0)?.toUpperCase() ?? "O";

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
      </div>

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
