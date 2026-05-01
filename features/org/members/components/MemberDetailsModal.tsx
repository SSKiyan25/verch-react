"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Mail,
  Calendar,
  GraduationCap,
  Building2,
  BookOpen,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { OrgMemberDetail } from "@/lib/types/org-memberships";
import { RevokeMembershipDialog } from "./RevokeMembershipDialog";
import { revokeMembershipAction } from "../actions/revokeMembershipAction";

type MemberDetailsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberDetail: OrgMemberDetail | null;
  isLoading: boolean;
  error: string | null;
  orgId: string;
};

export function MemberDetailsModal({
  open,
  onOpenChange,
  memberDetail,
  isLoading,
  error,
}: MemberDetailsModalProps) {
  const router = useRouter();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRevoke = async (reason?: string) => {
    if (!memberDetail) return;

    startTransition(async () => {
      const result = await revokeMembershipAction({
        membershipId: memberDetail.memberId,
        reason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership revoked");
      setRevokeDialogOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  };

  const getVerificationStatusConfig = (status: string | null) => {
    switch (status) {
      case "verified":
        return {
          icon: CheckCircle2,
          label: "Verified",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case "pending":
        return {
          icon: Clock,
          label: "Pending",
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
      case "rejected":
        return {
          icon: XCircle,
          label: "Rejected",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
      case "unverified":
        return {
          icon: AlertTriangle,
          label: "Unverified",
          variant: "outline" as const,
          className: "border-muted-foreground/30",
        };
      default:
        return {
          icon: AlertTriangle,
          label: "N/A",
          variant: "outline" as const,
          className: "border-muted-foreground/30",
        };
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6 py-4">
          {/* Avatar & Name Skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          {/* Info Sections Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!memberDetail) {
      return (
        <Alert className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Member not found</AlertDescription>
        </Alert>
      );
    }

    const initials = memberDetail.fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const verificationConfig = getVerificationStatusConfig(memberDetail.verificationStatus);
    const VerificationIcon = verificationConfig.icon;

    return (
      <div className="space-y-6 py-4">
        {/* Header: Avatar + Name + Position */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={memberDetail.avatarUrl ?? undefined} alt={memberDetail.fullName} />
            <AvatarFallback className="text-2xl">
              {initials || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold truncate">{memberDetail.fullName}</h2>
            {memberDetail.position && (
              <Badge variant="secondary" className="mt-2">
                {memberDetail.position}
              </Badge>
            )}
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Basic Information
          </h3>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <dt className="text-sm text-muted-foreground min-w-[80px]">Email</dt>
              <dd className="text-sm font-medium flex-1 truncate">{memberDetail.email}</dd>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <dt className="text-sm text-muted-foreground min-w-[80px]">Joined</dt>
              <dd className="text-sm font-medium">
                {memberDetail.joinDate
                  ? format(new Date(memberDetail.joinDate), "MMMM d, yyyy")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Student Verification Section */}
        {(memberDetail.verificationStatus || 
          memberDetail.studentIdNumber ||
          memberDetail.college ||
          memberDetail.course) && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Student Verification
              </h3>
              {memberDetail.verificationStatus && (
                <Badge variant={verificationConfig.variant} className={verificationConfig.className}>
                  <VerificationIcon className="h-3 w-3 mr-1" />
                  {verificationConfig.label}
                </Badge>
              )}
            </div>

            <dl className="space-y-3">
              {memberDetail.studentIdNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Student ID</dt>
                  <dd className="text-sm font-mono font-medium">
                    {memberDetail.studentIdNumber}
                  </dd>
                </div>
              )}

              {(memberDetail.firstName || memberDetail.lastName) && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Full Name</dt>
                  <dd className="text-sm font-medium">
                    {memberDetail.firstName} {memberDetail.lastName}
                  </dd>
                </div>
              )}

              {memberDetail.college && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">College</dt>
                  <dd className="text-sm font-medium">{memberDetail.college}</dd>
                </div>
              )}

              {memberDetail.department && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Department</dt>
                  <dd className="text-sm font-medium">{memberDetail.department}</dd>
                </div>
              )}

              {memberDetail.course && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Course</dt>
                  <dd className="text-sm font-medium">{memberDetail.course}</dd>
                </div>
              )}

              {memberDetail.yearLevel && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Year Level</dt>
                  <dd className="text-sm font-medium">
                    {memberDetail.yearLevel}
                    {memberDetail.yearLevel === 1
                      ? "st"
                      : memberDetail.yearLevel === 2
                        ? "nd"
                        : memberDetail.yearLevel === 3
                          ? "rd"
                          : "th"}{" "}
                    Year
                  </dd>
                </div>
              )}

              {memberDetail.schoolEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">School Email</dt>
                  <dd className="text-sm font-medium truncate">{memberDetail.schoolEmail}</dd>
                </div>
              )}

              {memberDetail.verifiedAt && memberDetail.verificationStatus === "verified" && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[100px]">Verified On</dt>
                  <dd className="text-sm font-medium">
                    {format(new Date(memberDetail.verifiedAt), "MMMM d, yyyy")}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View detailed information about this organization member
            </DialogDescription>
          </DialogHeader>

          {renderContent()}

          {memberDetail && !isLoading && !error && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRevokeDialogOpen(true)}
                disabled={isPending}
              >
                Revoke Membership
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {memberDetail && (
        <RevokeMembershipDialog
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
          memberName={memberDetail.fullName}
          onConfirm={handleRevoke}
          isPending={isPending}
        />
      )}
    </>
  );
}
