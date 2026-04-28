"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  X,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { updatePassword } from "@/features/forgot-password/actions/auth";
import type { ActionResult } from "@/lib/types/actions";

const initialState: ActionResult = { success: false, error: "" };

function validatePassword(password: string) {
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
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState,
  );

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const isFormValid = passwordValidation.isValid && passwordsMatch;

  // Handle success after state updates
  if (state?.success && state !== initialState) {
    toast.success(
      "Password reset successfully! Please log in with your new password.",
    );
    router.push("/login");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error state */}
          {!state?.success && "error" in state && state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pr-10"
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="pr-10"
                  required
                  autoComplete="new-password"
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
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <Alert>
              <Shield className="h-4 w-4" />
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
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || isPending}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Resetting Password...
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
