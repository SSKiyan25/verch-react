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

export function AdminLayoutClient({
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
    const relevantSegments = segments[0] === "admin" ? segments.slice(1) : segments;

    let currentPath = "/admin";

    for (let i = 0; i < relevantSegments.length; i++) {
      const segment = relevantSegments[i];
      currentPath += `/${segment}`;

      // Try to find the nav item for this segment
      const navItem = adminNavItems.find((item) => {
        const itemPath = item.url?.replace(/^\/admin/, "") || "";
        return itemPath === `/${segment}` || itemPath.startsWith(`/${segment}/`);
      });

      breadcrumbs.push({
        title: navItem?.title || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        isLast: i === relevantSegments.length - 1,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Show loading screen while checking auth
  if (isCheckingAuth || loading) {
    return <LoadingScreen />;
  }

  // If not admin after auth check completes, show nothing (will redirect)
  if (!user || user.role !== "admin") {
    return null;
  }

  // Prepare user and nav for AppSidebar
  const sidebarUser = {
    name: user.full_name || user.email || "Admin",
    email: user.email,
    avatar: user.avatar_url || "",
  };

  const navMain = adminNavItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.icon.displayName || item.icon.name || "default",
  }));

  const iconMap = adminNavItems.reduce((map, item) => {
    const iconKey = item.icon.displayName || item.icon.name || "default";
    map[iconKey] = item.icon;
    return map;
  }, {} as Record<string, React.ComponentType<any>>);

  return (
    <SidebarProvider className="overflow-hidden">
      <AppSidebar 
        user={sidebarUser}
        navMain={navMain}
        iconMap={iconMap}
        homeUrl="/admin/dashboard"
        brandName="Verch Admin"
      />
      <SidebarInset className="overflow-hidden">
        {/* Header with Breadcrumbs */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-sidebar px-4 text-secondary-foreground">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo-verch.webp"
                alt="Verch Logo"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="font-semibold text-lg">Verch Admin</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs
                  .flatMap((crumb, index) => [
                    <BreadcrumbItem key={crumb.href}>
                      {crumb.isLast ? (
                        <BreadcrumbPage className="text-secondary-foreground font-medium">
                          {crumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            href={crumb.href}
                            className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
                          >
                            {crumb.title}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>,
                    index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator
                        key={`separator-${index}`}
                        className="text-secondary-foreground/60"
                      />
                    ),
                  ])
                  .flat()
                  .filter(Boolean)}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-8">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-card md:min-h-min p-4 md:p-6 border">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
