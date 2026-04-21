"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  ShoppingCart,
  Building2,
  BadgeCheck,
  BanIcon,
  Unlock,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSuspendUser } from "@/features/admin/users/hooks/useSuspendUser";
import { useUnsuspendUser } from "@/features/admin/users/hooks/useUnsuspendUser";
import { useResetPassword } from "@/features/admin/users/hooks/useResetPassword";
import { SuspendUserDialog } from "@/features/admin/users/components/SuspendUserDialog";
import { UnsuspendUserDialog } from "@/features/admin/users/components/UnsuspendUserDialog";
import { ResetPasswordDialog } from "@/features/admin/users/components/ResetPasswordDialog";
import type { AdminUserDetail, UserRole } from "@/lib/types/admin-users";

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
    label: "Organization Admin",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  organization_manager: {
    label: "Organization Manager",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  organization_staff: {
    label: "Organization Staff",
    icon: Building2,
    className:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
};

type AdminUserDetailProps = {
  user: AdminUserDetail;
};

export function AdminUserDetail({ user }: AdminUserDetailProps) {
  const router = useRouter();
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isUnsuspendDialogOpen, setIsUnsuspendDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);

  const { suspend, isPending: isSuspending } = useSuspendUser();
  const { unsuspend, isPending: isUnsuspending } = useUnsuspendUser();
  const { resetPassword, isPending: isResetting } = useResetPassword();

  const roleConfig = user.role ? ROLE_CONFIG[user.role] : null;
  const RoleIcon = roleConfig?.icon;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSuspendSuccess = () => {
    setIsSuspendDialogOpen(false);
    router.refresh();
  };

  const handleUnsuspendSuccess = () => {
    setIsUnsuspendDialogOpen(false);
    router.refresh();
  };

  const handleResetPasswordSuccess = () => {
    setIsResetPasswordDialogOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link href="/admin/users">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {user.fullName}
            </h1>
            {user.studentStatus === "verified" && (
              <BadgeCheck className="h-5 w-5 text-green-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
          <div className="flex flex-wrap gap-2">
            {roleConfig && (
              <Badge
                variant="secondary"
                className={cn("text-xs font-medium", roleConfig.className)}
              >
                {RoleIcon && <RoleIcon className="h-3 w-3 mr-1" />}
                {roleConfig.label}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                user.isSuspended
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              )}
            >
              {user.isSuspended ? (
                <>
                  <BanIcon className="h-3 w-3 mr-1" />
                  Suspended
                </>
              ) : (
                "Active"
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-4">User Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">User ID</dt>
              <dd className="text-sm font-mono font-medium text-right">
                {user.id}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium text-right">{user.email}</dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Contact Number</dt>
              <dd className="text-sm font-medium text-right">
                {user.contactNumber ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Organization</dt>
              <dd className="text-sm font-medium text-right">
                {user.organizationName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Student Status</dt>
              <dd className="text-sm font-medium text-right capitalize">
                {user.studentStatus ?? "Not a student"}
              </dd>
            </div>
            {user.studentInfoId && (
              <div className="flex justify-between py-2 border-b">
                <dt className="text-sm text-muted-foreground">Verification</dt>
                <dd className="text-sm font-medium text-right">
                  <Link
                    href={`/admin/users/verifications/${user.studentInfoId}`}
                    className="text-primary hover:underline"
                  >
                    View Verification Details →
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Terms Accepted</dt>
              <dd className="text-sm font-medium text-right">
                {user.hasAgreedToTerms ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Joined</dt>
              <dd className="text-sm font-medium text-right">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm font-medium text-right">
                {format(new Date(user.updatedAt), "MMM d, yyyy")}
              </dd>
            </div>
          </dl>

          {user.isSuspended && user.suspendedAt && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
              <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
                Account Suspended
              </p>
              <p className="text-sm text-red-800 dark:text-red-500">
                Suspended on {format(new Date(user.suspendedAt), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-6 bg-background/95 backdrop-blur-sm p-4 border rounded-lg shadow-lg">
        <Button
          variant="outline"
          size="default"
          onClick={() => setIsResetPasswordDialogOpen(true)}
          disabled={isSuspending || isUnsuspending || isResetting}
          className="flex-1"
        >
          <Mail className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
        {user.isSuspended ? (
          <Button
            variant="default"
            size="default"
            onClick={() => setIsUnsuspendDialogOpen(true)}
            disabled={isSuspending || isUnsuspending || isResetting}
            className="flex-1"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Reactivate Account
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="default"
            onClick={() => setIsSuspendDialogOpen(true)}
            disabled={isSuspending || isUnsuspending || isResetting}
            className="flex-1"
          >
            <BanIcon className="h-4 w-4 mr-2" />
            Suspend Account
          </Button>
        )}
      </div>

      {/* Action dialogs */}
      <SuspendUserDialog
        open={isSuspendDialogOpen}
        onOpenChange={setIsSuspendDialogOpen}
        userName={user.fullName}
        onConfirm={(reason) => suspend(user.id, reason, handleSuspendSuccess)}
        isPending={isSuspending}
      />

      <UnsuspendUserDialog
        open={isUnsuspendDialogOpen}
        onOpenChange={setIsUnsuspendDialogOpen}
        userName={user.fullName}
        onConfirm={() => unsuspend(user.id, handleUnsuspendSuccess)}
        isPending={isUnsuspending}
      />

      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        userEmail={user.email}
        onConfirm={() => resetPassword(user.id, handleResetPasswordSuccess)}
        isPending={isResetting}
      />
    </div>
  );
}
