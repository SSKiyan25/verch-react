"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Check, X, UserMinus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { OrgMembershipApplicationItem } from "@/lib/types/org-memberships";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  active: {
    label: "Active",
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
} as const;

type MembershipApplicationCardProps = {
  member: OrgMembershipApplicationItem;
  onApprove: () => void;
  onReject: () => void;
  onRevoke: () => void;
};

export function MembershipApplicationCard({
  member,
  onApprove,
  onReject,
  onRevoke,
}: MembershipApplicationCardProps) {
  const statusConfig = STATUS_CONFIG[member.membership_status];
  const formattedDate = formatDistanceToNow(
    new Date(member.reviewed_at || member.created_at),
    { addSuffix: true },
  );

  // Action availability rules
  const canApprove =
    member.membership_status === "pending" ||
    member.membership_status === "rejected" ||
    member.membership_status === "inactive";
  const canReject = member.membership_status === "pending";
  const canRevoke = member.membership_status === "active";

  return (
    <TableRow className="hover:bg-muted transition-colors">
      <TableCell className="font-semibold">{member.user_name ?? "—"}</TableCell>
      <TableCell className="text-center">
        <Badge
          variant="secondary"
          className={cn("text-xs font-medium", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
        {member.student_year_level
          ? `${member.student_year_level}${member.student_year_level === 1 ? "st" : member.student_year_level === 2 ? "nd" : member.student_year_level === 3 ? "rd" : "th"} Year`
          : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
        —
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {formattedDate}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          {canReject && canApprove && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Reject</span>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Approve</span>
              </Button>
            </>
          )}
          {canRevoke && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRevoke();
              }}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Revoke
            </Button>
          )}
          {!canApprove && !canReject && !canRevoke && (
            <Button size="sm" variant="ghost">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
