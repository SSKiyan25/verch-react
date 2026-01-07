/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useState, useEffect } from "react";
import { LoginForm } from "@/features/login/components/LoginForm";
import { Features } from "@/features/login/components/Features";
import { useTermsAcceptance } from "@/features/login/hooks/useTermsAcceptance";
import { useLogin } from "@/features/login/hooks/useLogin";

export default function LoginPage() {
  const { needsTermsAcceptance, handleTermsAccepted, isTermsAccepting } =
    useLogin();
  const {
    acceptTerms,
    signOut,
    isLoading: termsLoading,
    error: termsError,
  } = useTermsAcceptance();

  // Show modal when terms acceptance is needed
  useEffect(() => {
    if (needsTermsAcceptance) {
      console.log("Terms acceptance needed, modal should open");
    }
  }, [needsTermsAcceptance]);

  const handleTermsAccept = async () => {
    console.log("handleTermsAccept called - starting terms acceptance");
    const result = await acceptTerms();
    console.log("acceptTerms result:", result);

    if (result.success) {
      console.log("Terms accepted successfully, calling handleTermsAccepted");
      await handleTermsAccepted();
      console.log("handleTermsAccepted completed");
    } else {
      console.error("Failed to accept terms:", result.error);
    }
  };

  const handleTermsClose = () => {
    // User chose to sign out instead of accepting terms
    console.log("User declined terms, signing out");
    signOut();
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Mobile Layout - Stack vertically with proper backgrounds */}
      <div className="lg:hidden">
        {/* Login Form Section - Yellow Background with independent spacing */}
        <div className="bg-background py-10">
          <LoginForm
            onTermsAccept={handleTermsAccept}
            onTermsClose={handleTermsClose}
            termsLoading={termsLoading || isTermsAccepting}
          />
        </div>

        {/* Features Section - Green Background with independent spacing */}
        <div className="bg-primary py-8">
          <Features />
        </div>
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Features */}
        <div className="flex-1 flex items-center justify-center bg-primary p-8">
          <div className="w-full">
            <Features />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="w-full">
            <LoginForm
              onTermsAccept={handleTermsAccept}
              onTermsClose={handleTermsClose}
              termsLoading={termsLoading || isTermsAccepting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
