"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Shield,
  Lock,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useChangePassword } from "../hooks/useChangePassword";
import { useAdminPasswordCheck } from "../hooks/useAdminPasswordCheck";

interface ChangePassModalProps {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePassModal({
  isOpen,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  organizationId,
  onClose,
  onSuccess,
}: ChangePassModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(isOpen);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { changePassword, isLoading, error, clearError } = useChangePassword();
  const { markPasswordChanged } = useAdminPasswordCheck();

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (newPassword !== confirmPassword) {
      return;
    }

    const result = await changePassword({
      currentPassword,
      newPassword,
    });

    if (result.success) {
      markPasswordChanged();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
      onSuccess?.();
      setIsModalOpen(false); // Immediately close the modal
      onClose();
    }
  };

  // Enhanced password validation
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return {
      isLongEnough,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid:
        isLongEnough &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
    };
  };

  const passwordValidation = validatePassword(newPassword);
  const isFormValid =
    currentPassword.length > 0 &&
    passwordValidation.isValid &&
    newPassword === confirmPassword;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-semibold">
              Security Update Required
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base text-center sm:text-left">
            As an organization admin, please change your default password for
            enhanced security.
          </DialogDescription>
        </DialogHeader>

        {/* Admin Password Change Info Card */}
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  Default Password Detected
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                  For security reasons, organization administrators must change
                  their default password before accessing the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-medium">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {/* Password Requirements with Visual Feedback */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              <strong>Password Requirements:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li
                  className={`flex items-center gap-2 ${
                    passwordValidation.isLongEnough
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordValidation.isLongEnough ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  At least 8 characters long
                </li>
                <li
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasUpperCase
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordValidation.hasUpperCase ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Include uppercase letters (A-Z)
                </li>
                <li
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasLowerCase
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordValidation.hasLowerCase ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Include lowercase letters (a-z)
                </li>
                <li
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasNumbers
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordValidation.hasNumbers ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Include at least one number
                </li>
                <li
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasSpecialChar
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordValidation.hasSpecialChar ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Include at least one special character
                </li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Please ensure all requirements are met before submitting your
                new password.
              </p>
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="submit"
              className="w-full sm:w-auto order-1 sm:order-2"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating Password...
                </div>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
