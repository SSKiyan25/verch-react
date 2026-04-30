/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowRight } from "lucide-react";

interface EmailStepProps {
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
}

export function EmailStep({ formData, setFormData, onNext }: EmailStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canProceed =
    formData.email.trim() !== "" && validateEmail(formData.email);

  const handleSendCode = async () => {
    if (!canProceed) return;

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

      // Check response status BEFORE parsing JSON
      if (!response.ok) {
        let errorMessage = "Failed to send verification code";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Response is not JSON (likely HTML error page)
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // const data = await response.json();

      setIsCodeSent(true);

      // Auto proceed to next step after sending
      setTimeout(() => {
        onNext();
      }, 1500);
    } catch (err: any) {
      setError(
        err.message || "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Enter Your Email Address
        </h3>
        <p className="text-muted-foreground mt-2">
          We&apos;ll send you a verification code to get started
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev: any) => ({ ...prev, email: e.target.value }))
            }
            placeholder="Enter your email address"
            disabled={isLoading || isCodeSent}
          />
          {!validateEmail(formData.email) && formData.email && (
            <p className="text-sm text-destructive">
              Please enter a valid email address
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isCodeSent && (
          <Alert>
            <AlertDescription>
              Verification code sent to {formData.email}! Check your email and
              proceed to the next step.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSendCode}
          disabled={!canProceed || isLoading || isCodeSent}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            "Sending Code..."
          ) : isCodeSent ? (
            "Code Sent!"
          ) : (
            <>
              Send Verification Code
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
