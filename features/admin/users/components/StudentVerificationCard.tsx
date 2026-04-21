"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { StudentVerificationListItem } from "@/lib/types/admin-student-verifications";

const STATUS_CONFIG = {
  unverified: {
    label: "Unverified",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  },
  pending: {
    label: "Pending Review",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  verified: {
    label: "Verified",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
} as const;

type StudentVerificationCardProps = {
  verification: StudentVerificationListItem;
};

export function StudentVerificationCard({
  verification,
}: StudentVerificationCardProps) {
  const statusConfig = STATUS_CONFIG[verification.verification_status];
  const formattedDate = formatDistanceToNow(new Date(verification.created_at), {
    addSuffix: true,
  });

  return (
    <TableRow className="hover:bg-muted cursor-pointer transition-colors">
      <TableCell className="font-semibold">
        {verification.first_name && verification.last_name
          ? `${verification.first_name} ${verification.last_name}`
          : "—"}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {verification.id_number ?? "—"}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[140px]">
        {verification.college ?? "—"}
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant="secondary"
          className={cn("text-xs font-medium", statusConfig.className)}
        >
          {verification.verification_status === "verified" && (
            <BadgeCheck className="h-3 w-3 mr-1" />
          )}
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {formattedDate}
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/admin/users/verifications/${verification.id}`}>
          <Button
            variant={
              verification.verification_status === "pending"
                ? "default"
                : "ghost"
            }
            size="sm"
          >
            {verification.verification_status === "pending" ? "Review" : "View"}
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}
