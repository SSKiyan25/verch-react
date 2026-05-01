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
  FileText,
} from "lucide-react";
import type { OrgMembershipApplicationItem } from "@/lib/types/org-memberships";
import { ApproveMembershipDialog } from "./ApproveMembershipDialog";
import { RejectMembershipDialog } from "./RejectMembershipDialog";
import { approveMembershipAction } from "../actions/approveMembershipAction";
import { rejectMembershipAction } from "../actions/rejectMembershipAction";

type ApplicationDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: OrgMembershipApplicationItem | null;
};

export function ApplicationDetailModal({
  open,
  onOpenChange,
  application,
}: ApplicationDetailModalProps) {
  const router = useRouter();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleApprove = async (position?: string) => {
    if (!application) return;

    startTransition(async () => {
      const result = await approveMembershipAction({
        membershipId: application.id,
        position,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership approved");
      setApproveDialogOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  };

  const handleReject = async (rejectionReason: string) => {
    if (!application) return;

    startTransition(async () => {
      const result = await rejectMembershipAction({
        membershipId: application.id,
        rejectionReason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership rejected");
      setRejectDialogOpen(false);
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
          label: "Pending Verification",
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
      case "rejected":
        return {
          icon: XCircle,
          label: "Verification Rejected",
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
          label: "No Verification",
          variant: "outline" as const,
          className: "border-muted-foreground/30",
        };
    }
  };

  const getMembershipStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        };
      case "active":
        return {
          label: "Active Member",
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
      case "inactive":
        return {
          label: "Inactive",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        };
      default:
        return {
          label: status,
          className: "",
        };
    }
  };

  if (!application) {
    return null;
  }

  const initials = (application.user_name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const verificationConfig = getVerificationStatusConfig(application.student_verification_status);
  const membershipConfig = getMembershipStatusConfig(application.membership_status);
  const VerificationIcon = verificationConfig.icon;

  const canApprove =
    application.membership_status === "pending" ||
    application.membership_status === "rejected" ||
    application.membership_status === "inactive";
  const canReject = application.membership_status === "pending";

  // Check if student has provided verification info
  const hasStudentInfo =
    application.student_id_number ||
    application.student_college ||
    application.student_course;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membership Application Details</DialogTitle>
            <DialogDescription>
              Review the applicant&apos;s information and student verification status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Header: Avatar + Name + Status */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage
                  src={application.user_avatar_url ?? undefined}
                  alt={application.user_name ?? "User"}
                />
                <AvatarFallback className="text-2xl">
                  {initials || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-semibold truncate">
                  {application.user_name || "Unknown User"}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className={membershipConfig.className}>
                    {membershipConfig.label}
                  </Badge>
                  {application.position && (
                    <Badge variant="outline">{application.position}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <dl className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[80px]">Email</dt>
                  <dd className="text-sm font-medium flex-1 truncate">
                    {application.user_email}
                  </dd>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-sm text-muted-foreground min-w-[80px]">Applied</dt>
                  <dd className="text-sm font-medium">
                    {format(new Date(application.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Student Verification Section */}
            {hasStudentInfo ? (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Student Verification Details
                  </h3>
                  {application.student_verification_status && (
                    <Badge
                      variant={verificationConfig.variant}
                      className={verificationConfig.className}
                    >
                      <VerificationIcon className="h-3 w-3 mr-1" />
                      {verificationConfig.label}
                    </Badge>
                  )}
                </div>

                <dl className="space-y-3">
                  {application.student_id_number && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Student ID
                      </dt>
                      <dd className="text-sm font-mono font-medium">
                        {application.student_id_number}
                      </dd>
                    </div>
                  )}

                  {(application.student_first_name || application.student_last_name) && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Student Name
                      </dt>
                      <dd className="text-sm font-medium">
                        {application.student_first_name} {application.student_last_name}
                      </dd>
                    </div>
                  )}

                  {application.student_college && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">College</dt>
                      <dd className="text-sm font-medium">{application.student_college}</dd>
                    </div>
                  )}

                  {application.student_department && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Department
                      </dt>
                      <dd className="text-sm font-medium">
                        {application.student_department}
                      </dd>
                    </div>
                  )}

                  {application.student_course && (
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">Course</dt>
                      <dd className="text-sm font-medium">{application.student_course}</dd>
                    </div>
                  )}

                  {application.student_year_level && (
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Year Level
                      </dt>
                      <dd className="text-sm font-medium">
                        {application.student_year_level}
                        {application.student_year_level === 1
                          ? "st"
                          : application.student_year_level === 2
                            ? "nd"
                            : application.student_year_level === 3
                              ? "rd"
                              : "th"}{" "}
                        Year
                      </dd>
                    </div>
                  )}

                  {application.academic_year && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Academic Year
                      </dt>
                      <dd className="text-sm font-medium">{application.academic_year}</dd>
                    </div>
                  )}
                </dl>

                {application.student_verification_status === "verified" && (
                  <Alert className="mt-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-400">
                      This student&apos;s ID has been verified by the platform administrator.
                    </AlertDescription>
                  </Alert>
                )}

                {application.student_verification_status === "pending" && (
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/30">
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                      Student verification is pending platform admin review.
                    </AlertDescription>
                  </Alert>
                )}

                {application.student_verification_status === "rejected" && (
                  <Alert className="mt-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-400">
                      Student verification was rejected by platform administrator.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Student Verification Details
                </h3>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This applicant has not provided student verification information yet.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Review History */}
            {(application.reviewed_at || application.rejection_reason) && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Review History
                </h3>
                <dl className="space-y-3">
                  {application.reviewed_at && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="text-sm text-muted-foreground min-w-[100px]">
                        Reviewed
                      </dt>
                      <dd className="text-sm font-medium">
                        {format(new Date(application.reviewed_at), "MMMM d, yyyy 'at' h:mm a")}
                        {application.reviewed_by_name &&
                          ` by ${application.reviewed_by_name}`}
                      </dd>
                    </div>
                  )}

                  {application.rejection_reason && (
                    <div className="flex gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm text-muted-foreground mb-1">
                          Rejection Reason
                        </dt>
                        <dd className="text-sm font-medium bg-muted p-3 rounded-md">
                          {application.rejection_reason}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Application
              </Button>
            )}
            {canApprove && (
              <Button
                variant="default"
                onClick={() => setApproveDialogOpen(true)}
                disabled={isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Membership
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {application && (
        <>
          <ApproveMembershipDialog
            open={approveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            memberName={application.user_name || "User"}
            onConfirm={handleApprove}
            isPending={isPending}
          />
          <RejectMembershipDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            memberName={application.user_name || "User"}
            onConfirm={handleReject}
            isPending={isPending}
          />
        </>
      )}
    </>
  );
}
