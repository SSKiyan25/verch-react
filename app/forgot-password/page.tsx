"use client";

import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Mail, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { sendResetEmail } from "@/features/forgot-password/actions/auth";
import type { ActionResult } from "@/lib/types/actions";

const initialState: ActionResult = { success: false, error: "" };

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(
    sendResetEmail,
    initialState,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Check your email for the reset link.");
    }
  }, [state?.success]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error from token exchange (invalid/expired link) */}
          {error === "invalid-link" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This reset link is invalid or has expired. Please request a new
                one below.
              </AlertDescription>
            </Alert>
          )}

          {error === "session-expired" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your session has expired. Please request a new password reset
                link.
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {state?.success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                If an account with that email exists, we&apos;ve sent a password
                reset link. Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {/* Validation error */}
          {!state?.success && "error" in state && state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                disabled={isPending || state?.success}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || state?.success}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
