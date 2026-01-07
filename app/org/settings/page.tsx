"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { ChangePassModal } from "@/features/org/settings/general/components/ChangePassModal";
import { useAdminPasswordCheck } from "@/features/org/settings/general/hooks/useAdminPasswordCheck";

export default function OrganizationSettings() {
  const {
    needsPasswordChange,
    isLoading: passwordCheckLoading,
    isOrganizationAdmin,
  } = useAdminPasswordCheck();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Show modal if organization admin needs to change password
  const shouldShowModal =
    !passwordCheckLoading && needsPasswordChange && isOrganizationAdmin;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Manage your organization settings
            </p>
          </div>
        </div>

        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">
              This is general settings, not yet implemented.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The organization general settings features are currently under
              development. Check back soon for commission rates, business hours,
              notifications, and more!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal - Only for Organization Admins */}
      {isOrganizationAdmin && (
        <ChangePassModal
          isOpen={shouldShowModal || showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            console.log("Password changed successfully!");
          }}
        />
      )}
    </>
  );
}
