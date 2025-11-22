/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { AppSidebar } from "@/components/navbar/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname, useRouter } from "next/navigation";
import { adminNavItems } from "@/lib/config/admin-nav";
import { useUser } from "@/lib/hooks/use-user";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user has admin access
  useEffect(() => {
    const checkAuth = () => {
      // If still loading, wait a bit longer
      if (loading) {
        console.log("Still loading user data...");
        setIsCheckingAuth(true);
        return;
      }

      // If no user at all, redirect to login
      if (!user) {
        console.log("No user found, redirecting to login");
        router.replace("/login");
        return;
      }

      // If user exists but not admin, redirect to login
      if (user.role !== "admin") {
        console.log(
          `User role is ${user.role}, not admin. Redirecting to login`
        );
        router.replace("/login");
        return;
      }

      // If user is admin, allow access
      console.log("Admin user authenticated successfully");
      setIsCheckingAuth(false);
    };

    // Small delay to ensure auth state is fully loaded
    const timeoutId = setTimeout(checkAuth, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, loading, router]);

  // Generate breadcrumbs from pathname, excluding "admin"
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    // Skip the first segment if it's "admin"
    const startIndex = segments[0] === "admin" ? 1 : 0;

    for (let i = startIndex; i < segments.length; i++) {
      const segment = segments[i];
      const href = "/" + segments.slice(0, i + 1).join("/");
      const title = segment.charAt(0).toUpperCase() + segment.slice(1);

      breadcrumbs.push({
        title,
        href,
        isLast: i === segments.length - 1,
      });
    }

    return breadcrumbs;
  };

  // Show loading state while checking authentication
  if (loading || isCheckingAuth) {
    return <LoadingScreen message="Authenticating admin access..." />;
  }

  // Don't render if no user or not admin (this should not happen due to redirect above)
  if (!user || user.role !== "admin") {
    return <LoadingScreen message="Redirecting..." />;
  }

  // Transform adminNavItems to match AppSidebar's expected format
  const transformedNavItems = adminNavItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon:
      typeof item.icon === "function"
        ? item.icon.displayName || item.icon.name || "default"
        : item.icon,
  }));

  // Create iconMap from the original adminNavItems
  const iconMap = adminNavItems.reduce((map, item) => {
    const iconKey =
      typeof item.icon === "function"
        ? item.icon.displayName || item.icon.name || "default"
        : item.icon;
    if (typeof item.icon === "function") {
      map[iconKey] = item.icon;
    }
    return map;
  }, {} as Record<string, React.ComponentType<any>>);

  const breadcrumbs = generateBreadcrumbs();

  // Use real user data from Supabase
  const currentUser = {
    name: user.full_name,
    email: user.email,
    avatar: user.avatar_url || "",
    role: user.role,
  };

  return (
    <SidebarProvider>
      <AppSidebar
        user={currentUser}
        navMain={transformedNavItems}
        iconMap={iconMap}
        homeUrl="/admin/dashboard"
        brandName="Verch Admin"
        className="bg-card border-r border-sidebar-border"
      />
      <SidebarInset>
        {/* Header with breadcrumbs */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-card border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Mobile Logo */}
            <div className="flex items-center gap-2 md:hidden">
              <Image
                src="/logo-verch.webp"
                alt="Verch Logo"
                width={24}
                height={24}
                className="object-contain"
              />
              <span className="font-semibold">Admin Panel</span>
            </div>

            {/* Breadcrumbs - Hidden on mobile */}
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {breadcrumbs
                  .map((crumb, index) => [
                    <BreadcrumbItem key={crumb.href}>
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.title}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>,
                    index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator key={`separator-${index}`} />
                    ),
                  ])
                  .flat()
                  .filter(Boolean)}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-card md:min-h-min p-4 md:p-6 border">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
