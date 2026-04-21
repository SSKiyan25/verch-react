"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Shield,
  ShoppingCart,
  Building2,
  BadgeCheck,
  BanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { AdminUserListItem, UserRole } from "@/lib/types/admin-users";

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: typeof Shield; className: string }
> = {
  admin: {
    label: "Platform Admin",
    icon: Shield,
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  customer: {
    label: "Customer",
    icon: ShoppingCart,
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  organization_admin: {
    label: "Org Admin",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  organization_manager: {
    label: "Org Manager",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  organization_staff: {
    label: "Org Staff",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
};

type AdminUserCardProps = {
  user: AdminUserListItem;
};

export function AdminUserCard({ user }: AdminUserCardProps) {
  const roleConfig = user.role ? ROLE_CONFIG[user.role] : null;
  const RoleIcon = roleConfig?.icon;
  const formattedDate = formatDistanceToNow(new Date(user.createdAt), {
    addSuffix: true,
  });

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TableRow
      className={cn(
        "hover:bg-muted cursor-pointer transition-colors",
        user.isSuspended && "opacity-60",
      )}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.avatarUrl ?? undefined}
              alt={user.fullName}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold flex items-center gap-2">
              {user.fullName}
              {user.studentVerificationStatus === "verified" && (
                <BadgeCheck className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {roleConfig && (
          <Badge
            variant="secondary"
            className={cn("text-xs font-medium", roleConfig.className)}
          >
            {RoleIcon && <RoleIcon className="h-3 w-3 mr-1" />}
            {roleConfig.label}
          </Badge>
        )}
        {!roleConfig && (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {user.organizationName ?? "—"}
      </TableCell>
      <TableCell className="text-center">
        {user.isSuspended ? (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium"
          >
            <BanIcon className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium"
          >
            Active
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {formattedDate}
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/admin/users/${user.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}
