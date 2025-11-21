"use client";
import { LoginForm } from "@/features/login/components/LoginForm";
import { Features } from "@/features/login/components/Features";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Mobile Layout - Stack vertically with proper backgrounds */}
      <div className="lg:hidden">
        {/* Login Form Section - Yellow Background */}
        <div className="bg-background">
          <LoginForm />
        </div>

        {/* Features Section - Green Background */}
        <div className="bg-primary">
          <Features />
        </div>
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Features (Darker Green) */}
        <div className="flex-1 flex items-center justify-center bg-primary">
          <Features />
        </div>

        {/* Right Side - Login Form (Lighter Yellow) */}
        <div className="flex-1 flex items-center justify-center bg-background">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
