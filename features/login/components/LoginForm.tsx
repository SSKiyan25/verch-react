"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Add authentication logic here
    console.log("Email login:", { email, password });

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    // TODO: Add Google authentication logic here
    console.log("Google login");

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 my-10 lg:p-0">
      <Card className="border-0 shadow-none lg:border lg:shadow-lg bg-card">
        <CardHeader className="text-center space-y-4 pb-4">
          {/* Logo - Mobile Only */}
          <div className="lg:hidden flex justify-center">
            <Image
              src="/logo-verch-2.png"
              alt="Verch Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>

          <div>
            <CardTitle className="text-2xl lg:text-3xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base mt-2 text-muted-foreground">
              Sign in to your Verch account to start shopping
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Sign In - Primary Method */}
          <div className="space-y-3">
            <Button
              variant="default"
              className="w-full h-12 text-base font-medium"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            {/* Info about Google Auth */}
            <div className="flex items-start space-x-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">For Students:</strong> Use
                your Google account to sign in and start shopping from VSU
                student organizations.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or use organization account
              </span>
            </div>
          </div>

          {/* Email/Password Form - For Organizations Only */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Organization Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your organization email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In as Organization"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          {/* Organization Contact Info */}
          <div className="w-full p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-center space-y-2">
              <h4 className="font-semibold text-foreground text-sm">
                Want to sell your organization&apos;s merchandise?
              </h4>
              <p className="text-xs text-muted-foreground">
                Student organizations interested in creating a store should
                contact us for account setup and onboarding.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
