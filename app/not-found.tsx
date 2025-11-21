/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// import Image from "next/image";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  // Initialize state directly instead of using useEffect
  const [canGoBack, setCanGoBack] = useState(() => {
    if (typeof window !== "undefined") {
      return window.history.length > 1;
    }
    return false;
  });

  const handleGoBack = () => {
    if (typeof window !== "undefined" && canGoBack) {
      window.history.back();
    }
  };

  // ...existing code...
  return (
    <div className="min-h-screen w-full bg-white dark:bg-background relative overflow-hidden flex items-center justify-center animate-fade-in">
      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[80vh]">
          {/* Mobile Image - Shows on top for mobile */}
          <div className="lg:hidden w-full flex justify-center items-center order-1 animate-fade-in-up animation-delay-200">
            <div className="w-full max-w-[300px] flex justify-center">
              {/* <Image
                src="/images/404-img.png"
                alt="Verch Logo"
                width={250}
                height={190}
                className="w-auto h-auto object-contain max-w-full max-h-[200px]"
                priority
              /> */}
            </div>
          </div>

          {/* Left Side - 404 Content */}
          <div className="w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none flex flex-col justify-center order-2 lg:order-1">
            {/* 404 Number */}
            <div className="mb-4 lg:mb-6 text-center lg:text-left animate-fade-in-up animation-delay-300">
              <div className="font-nunito text-8xl sm:text-9xl lg:text-[120px] font-bold text-primary leading-none mb-2 opacity-80">
                404
              </div>
              <h1 className="font-nunito text-3xl sm:text-4xl lg:text-[42px] font-bold text-foreground leading-tight mb-2 lg:mb-3">
                Page Not Found
              </h1>
              <p className="font-nunito text-lg sm:text-xl lg:text-[24px] text-muted-foreground leading-relaxed">
                The page you&apos;re looking for doesn&apos;t exist or has been
                moved. Let&apos;s get you back to shopping!
              </p>
            </div>

            {/* Action Buttons Container */}
            <div className="bg-card border border-border rounded-[30px] lg:rounded-[40px] p-6 sm:p-7 lg:p-8 w-full max-w-[520px] mx-auto lg:mx-0 shadow-lg animate-fade-in-up animation-delay-500">
              {/* Suggested Actions */}
              <div className="space-y-4 animate-fade-in-up animation-delay-600">
                <h2 className="font-nunito text-xl text-card-foreground mb-4">
                  What would you like to do?
                </h2>

                {/* Go Home Button */}
                <Link
                  href="/"
                  className="w-full h-[50px] bg-primary text-primary-foreground font-nunito text-[16px] rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3 group"
                >
                  <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Go to Homepage
                </Link>

                {/* Go Back Button */}
                <button
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  className="w-full h-[50px] border border-border bg-input text-foreground font-nunito text-[16px] rounded-xl hover:bg-accent transition-all duration-200 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Go Back
                </button>

                {/* Additional Verch-specific buttons */}
                <Link
                  href="/products"
                  className="w-full h-[50px] border border-border bg-secondary text-secondary-foreground font-nunito text-[16px] rounded-xl hover:bg-secondary/90 transition-all duration-200 flex items-center justify-center gap-3 group"
                >
                  Browse Products
                </Link>

                <Link
                  href="/stores"
                  className="w-full h-[50px] border border-border bg-accent text-accent-foreground font-nunito text-[16px] rounded-xl hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-3 group"
                >
                  View Stores
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side - Illustration (Desktop only) */}
          <div className="hidden lg:flex justify-center items-center order-3 lg:order-2 animate-fade-in-left animation-delay-400">
            <div className="w-full max-w-[750px] flex justify-center">
              {/* <Image
                src="/images/404-img.png"
                alt="Verch Logo"
                width={450}
                height={340}
                className="w-auto h-auto object-contain max-w-full max-h-[380px]"
                priority
              /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
