"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { SettingsSaveButton } from "@/features/user/settings/components/shared/SettingsSaveButton";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";

export function ChangePasswordForm() {
  const [isGoogleUser, setIsGoogleUser] = useState<boolean | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function checkProvider() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.app_metadata?.provider === "google") {
        setIsGoogleUser(true);
      } else {
        setIsGoogleUser(false);
      }
    }
    checkProvider();
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    }
    if (newPassword === currentPassword) {
      errors.newPassword =
        "New password must be different from current password";
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setErrorMsg("Failed to update password");
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state while checking provider
  if (isGoogleUser === null) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="Security"
          description="Manage your password and account security."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Security"
        description="Manage your password and account security."
      />

      {isGoogleUser ? (
        <Alert className="border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            Your account uses Google Sign-In. Password changes are managed
            through your Google account.
          </AlertDescription>
        </Alert>
      ) : (
        <>
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

          <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-sm text-destructive">
                  {fieldErrors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-sm text-destructive">
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <SettingsSaveButton isLoading={isLoading} label="Update Password" />
          </form>
        </>
      )}
    </div>
  );
}
