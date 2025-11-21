/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { SiteHeader } from "@/components/navbar/site-header";
import { MobileBottomNav } from "@/components/navbar/mobile-bottom-nav";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Home as HomeIcon, ShoppingBag, Store, LogIn } from "lucide-react";
import { useState, useEffect } from "react";

// Define mobile icon map
const mobileIconMap = {
  home: HomeIcon,
  products: ShoppingBag,
  stores: Store,
  login: LogIn,
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Navigation links for public pages
  const navLinks = [
    {
      label: "Home",
      icon: "home",
      href: "/",
    },
    {
      label: "Products",
      icon: "products",
      href: "/products",
    },
    {
      label: "Stores",
      icon: "stores",
      href: "/stores",
    },
    {
      label: "Login",
      icon: "login",
      href: "/login",
    },
  ];

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <LoadingScreen message="Welcome to Verch! Loading your shopping experience..." />
    );
  }

  return (
    <div className="flex min-h-screen w-full ">
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader
          user={null}
          isAuthenticated={isAuthenticated}
          brandName="Verch"
          logoSrc="/logo-verch.webp"
          logoAlt="Verch Logo"
          homeUrl="/"
          loginUrl="/login"
        />
        <main className="flex-1 p-2 sm:p-4 pb-16 md:pb-4">{children}</main>
        <MobileBottomNav links={navLinks} iconMap={mobileIconMap} />
      </div>
    </div>
  );
}
