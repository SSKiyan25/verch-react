"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BadgeCheck, ZoomIn, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useVerifyStudent } from "@/features/admin/users/hooks/useVerifyStudent";
import { useRejectStudent } from "@/features/admin/users/hooks/useRejectStudent";
import { VerifyStudentDialog } from "@/features/admin/users/components/VerifyStudentDialog";
import { RejectStudentDialog } from "@/features/admin/users/components/RejectStudentDialog";
import type { StudentVerificationDetail as StudentVerificationDetailType } from "@/lib/types/admin-student-verifications";

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

type StudentVerificationDetailProps = {
  verification: StudentVerificationDetailType;
  idPhotoUrl: string | null;
};

export function StudentVerificationDetail({
  verification,
  idPhotoUrl,
}: StudentVerificationDetailProps) {
  const router = useRouter();
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const { verify, isPending: isVerifying } = useVerifyStudent();
  const { reject, isPending: isRejecting } = useRejectStudent();

  const statusConfig = STATUS_CONFIG[verification.verification_status];
  const formattedDate = formatDistanceToNow(new Date(verification.created_at), {
    addSuffix: true,
  });

  // Action availability rules
  const canVerify =
    verification.verification_status === "pending" ||
    verification.verification_status === "rejected";
  const canReject = verification.verification_status === "pending";

  const handleVerifySuccess = () => {
    setIsVerifyDialogOpen(false);
    router.refresh();
  };

  const handleRejectSuccess = () => {
    setIsRejectDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Student ID Verification
          </h1>
          <Badge
            variant="secondary"
            className={cn("text-xs font-medium", statusConfig.className)}
          >
            {verification.verification_status === "verified" && (
              <BadgeCheck className="h-3 w-3 mr-1" />
            )}
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {formattedDate}
        </p>
      </div>

      {/* ID Photo Card */}
      {idPhotoUrl && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Student ID Photo</h2>
              <div className="relative w-full aspect-video max-h-[400px] bg-muted rounded-lg overflow-hidden">
                <Image
                  src={idPhotoUrl}
                  alt="Student ID"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsImageDialogOpen(true)}
                className="w-full"
              >
                <ZoomIn className="h-4 w-4 mr-2" />
                View Full Size
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Information Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-4">Student Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Full Name</dt>
              <dd className="text-sm font-medium text-right">
                {verification.first_name && verification.last_name
                  ? `${verification.first_name} ${verification.last_name}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">ID Number</dt>
              <dd className="text-sm font-mono font-medium text-right">
                {verification.id_number ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">College</dt>
              <dd className="text-sm font-medium text-right">
                {verification.college ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Department</dt>
              <dd className="text-sm font-medium text-right">
                {verification.department ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Course</dt>
              <dd className="text-sm font-medium text-right">
                {verification.course ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-sm text-muted-foreground">Year Level</dt>
              <dd className="text-sm font-medium text-right">
                {verification.year_level
                  ? `${verification.year_level}${verification.year_level === 1 ? "st" : verification.year_level === 2 ? "nd" : verification.year_level === 3 ? "rd" : "th"} Year`
                  : "—"}
              </dd>
            </div>
            {verification.school_email && (
              <div className="flex justify-between py-2">
                <dt className="text-sm text-muted-foreground">School Email</dt>
                <dd className="text-sm font-medium text-right">
                  {verification.school_email}
                </dd>
              </div>
            )}
          </dl>

          {verification.verification_status === "rejected" &&
            verification.rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
                <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-800 dark:text-red-500">
                  {verification.rejection_reason}
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(canVerify || canReject) && (
        <div className="flex gap-3 sticky bottom-6 bg-background/95 backdrop-blur-sm p-4 border rounded-lg shadow-lg">
          {canReject && (
            <Button
              variant="outline"
              size="default"
              onClick={() => setIsRejectDialogOpen(true)}
              disabled={isVerifying || isRejecting}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}
          {canVerify && (
            <Button
              variant="default"
              size="default"
              onClick={() => setIsVerifyDialogOpen(true)}
              disabled={isVerifying || isRejecting}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
        </div>
      )}

      {/* Full-size image dialog */}
      {idPhotoUrl && (
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
            <div className="relative w-full h-full min-h-[60vh]">
              <Image
                src={idPhotoUrl}
                alt="Student ID Full Size"
                fill
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action dialogs */}
      <VerifyStudentDialog
        open={isVerifyDialogOpen}
        onOpenChange={setIsVerifyDialogOpen}
        studentName={
          verification.first_name && verification.last_name
            ? `${verification.first_name} ${verification.last_name}`
            : "this student"
        }
        onConfirm={() => verify(verification.id, handleVerifySuccess)}
        isPending={isVerifying}
      />

      <RejectStudentDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        studentName={
          verification.first_name && verification.last_name
            ? `${verification.first_name} ${verification.last_name}`
            : "this student"
        }
        onConfirm={(reason: string) =>
          reject(verification.id, reason, handleRejectSuccess)
        }
        isPending={isRejecting}
      />
    </div>
  );
}
