"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Plus } from "lucide-react";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { MembershipCard } from "@/features/user/settings/components/memberships/MembershipCard";
import { ApplyOrgDialog } from "@/features/user/settings/components/memberships/ApplyOrgDialog";
import { EmptyMemberships } from "@/features/user/settings/components/memberships/EmptyMemberships";
import { withdrawMembershipApplication } from "@/features/user/settings/actions/studentActions";
import type { UserMembership } from "@/lib/supabase/queries/user-settings";

interface MembershipListProps {
  memberships: UserMembership[];
  userId: string;
  isStudentVerified: boolean;
}

export function MembershipList({
  memberships: initialMemberships,
  userId,
  isStudentVerified,
}: MembershipListProps) {
  const router = useRouter();

  const [memberships, setMemberships] = useState(initialMemberships);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleWithdraw(membershipId: string) {
    // Optimistic removal
    const previous = memberships;
    setMemberships((prev) => prev.filter((m) => m.id !== membershipId));

    const result = await withdrawMembershipApplication(membershipId);
    if (result.success) {
      setSuccessMsg("Application withdrawn.");
      router.refresh();
    } else {
      setMemberships(previous);
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SettingsPageHeader
          title="Memberships"
          description="Manage your organization memberships."
        />
        {isStudentVerified && (
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="shrink-0"
          >
            <Plus className="mr-1 h-4 w-4" />
            Apply
          </Button>
        )}
      </div>

      {!isStudentVerified && (
        <Alert className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            You must verify your Student ID before applying to organizations.{" "}
            <Link
              href="/user/settings/student-id"
              className="font-medium underline"
            >
              Verify now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <SettingsSuccessAlert
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}
      {errorMsg && (
        <SettingsErrorAlert
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      {memberships.length === 0 && isStudentVerified ? (
        <EmptyMemberships />
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <MembershipCard
              key={membership.id}
              membership={membership}
              onWithdraw={() => handleWithdraw(membership.id)}
            />
          ))}
        </div>
      )}

      {isStudentVerified && (
        <ApplyOrgDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={userId}
        />
      )}
    </div>
  );
}
