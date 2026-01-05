/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react";

interface VerificationStepProps {
  formData: {
    email: string;
    name: string;
    description: string;
    logoUrl: string;
    contactNumber: string;
    commissionRate: number;
    status: "active" | "inactive" | "pending";
    isVerified: boolean;
    password: string;
    confirmPassword: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onNext: () => void;
  onPrev: () => void;
}

export function VerificationStep({
  formData,
  setFormData,
  onNext,
  onPrev,
}: VerificationStepProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const canProceed = verificationCode.length === 6;

  // Start cooldown on mount
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerifyCode = async () => {
    if (!canProceed) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use real API call
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Mark email as verified in form data
      setFormData((prev: any) => ({ ...prev, isVerified: true }));

      // Proceed to next step
      onNext();
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use real API call
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          type: "organization_verification",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification code");
      }

      // Reset states
      setVerificationCode("");
      setCanResend(false);
      setResendCooldown(60);

      // Start cooldown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Enter Verification Code
        </h3>
        <p className="text-muted-foreground mt-2">
          We sent a 6-digit code to <strong>{formData.email}</strong>
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="verificationCode"
            className="text-foreground text-center block"
          >
            Verification Code
          </Label>
          <Input
            id="verificationCode"
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationCode(value);
              setError(null);
            }}
            placeholder="000000"
            className="text-center text-2xl tracking-widest font-mono py-4"
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Resend code section */}
        <div className="text-center">
          {canResend ? (
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resend Code
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Resend code in {resendCooldown}s
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleVerifyCode}
            disabled={!canProceed || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              "Verifying..."
            ) : (
              <>
                Verify Code
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
