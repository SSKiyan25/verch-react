"use client";
import { LoginForm } from "@/features/login/components/LoginForm";
import { Features } from "@/features/login/components/Features";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Mobile Layout - Stack vertically with proper backgrounds */}
      <div className="lg:hidden">
        {/* Login Form Section - Yellow Background with independent spacing */}
        <div className="bg-background py-10">
          <LoginForm />
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
          <div className="w-full ">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
