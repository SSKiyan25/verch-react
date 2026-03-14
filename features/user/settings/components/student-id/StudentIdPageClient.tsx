"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { StudentIdStatusBadge } from "@/features/user/settings/components/student-id/StudentIdStatusBadge";
import { StudentIdVerifiedCard } from "@/features/user/settings/components/student-id/StudentIdVerifiedCard";
import { StudentIdForm } from "@/features/user/settings/components/student-id/StudentIdForm";
import type { StudentInfo } from "@/lib/supabase/queries/user-settings";

interface StudentIdPageProps {
  studentInfo: StudentInfo | null;
  userId: string;
}

export function StudentIdPage({ studentInfo, userId }: StudentIdPageProps) {
  const status = studentInfo?.verification_status ?? null;
  // console.log(
  //   "[StudentIdPage] Render with status:",
  //   status,
  //   "studentInfo:",
  //   studentInfo,
  // );
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Student ID"
        description="Verify your student identity to access member-only features."
      />

      {/* No record or unverified — show form */}
      {(status === null || status === "pending") && (
        <StudentIdForm studentInfo={studentInfo} userId={userId} />
      )}

      {/* Pending — read-only summary */}
      {status === "pending" && studentInfo && (
        <div className="space-y-4 max-w-lg">
          <StudentIdStatusBadge status="pending" />
          <div className="rounded-lg border p-4 space-y-2">
            <DetailRow label="ID Number" value={studentInfo.id_number} />
            <DetailRow
              label="Name"
              value={`${studentInfo.first_name} ${studentInfo.last_name}`}
            />
            {studentInfo.college && (
              <DetailRow label="College" value={studentInfo.college} />
            )}
            {studentInfo.department && (
              <DetailRow label="Department" value={studentInfo.department} />
            )}
            {studentInfo.course && (
              <DetailRow label="Course" value={studentInfo.course} />
            )}
            {studentInfo.year_level && (
              <DetailRow
                label="Year Level"
                value={`${studentInfo.year_level}`}
              />
            )}
            {studentInfo.school_email && (
              <DetailRow
                label="School Email"
                value={studentInfo.school_email}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Your submission is being reviewed. You&apos;ll be notified once
            it&apos;s processed.
          </p>
        </div>
      )}

      {/* Verified — celebratory card */}
      {status === "verified" && studentInfo && (
        <div className="max-w-lg">
          <StudentIdVerifiedCard studentInfo={studentInfo} />
        </div>
      )}

      {/* Rejected — show reason + re-submit form */}
      {status === "rejected" && studentInfo && (
        <div className="space-y-4">
          <StudentIdStatusBadge status="rejected" />
          {studentInfo.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Reason:</strong> {studentInfo.rejection_reason}
              </AlertDescription>
            </Alert>
          )}
          <StudentIdForm studentInfo={studentInfo} userId={userId} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
