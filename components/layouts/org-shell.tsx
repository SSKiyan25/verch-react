"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppSidebar } from "@/components/navbar/app-sidebar";
import { MobileBottomNav } from "@/components/navbar/mobile-bottom-nav";
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
import { generateBreadcrumbs } from "@/lib/utils/org-helpers";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";

// Define Navigation Items here (Static Data)
const orgNavItems = [
  {
    title: "Dashboard",
    url: "/org/dashboard",
    icon: LayoutDashboard,
    iconName: "LayoutDashboard",
  },
  {
    title: "Products",
    url: "/org/products",
    icon: Package,
    iconName: "Package",
  },
  {
    title: "Orders",
    url: "/org/orders",
    icon: ShoppingCart,
    iconName: "ShoppingCart",
  },
  { title: "Members", url: "/org/members", icon: Users, iconName: "Users" },
  {
    title: "Analytics",
    url: "/org/analytics",
    icon: BarChart3,
    iconName: "BarChart3",
  },
  {
    title: "Settings",
    url: "/org/settings",
    icon: Settings,
    iconName: "Settings",
  },
];

const mobileNavLinks = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/org/dashboard" },
  { label: "Products", icon: "Package", href: "/org/products" },
  { label: "Orders", icon: "ShoppingCart", href: "/org/orders" },
  { label: "Settings", icon: "Settings", href: "/org/settings" },
];

interface OrgShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  isSetupComplete: boolean;
  organizationLogo?: string;
}

export function OrgShell({
  children,
  user,
  isSetupComplete,
  organizationLogo,
}: OrgShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Handle Client-Side Redirection for Setup

  const userForSidebar = {
    ...user,
    avatar: organizationLogo || user.avatar, // Use org logo if available
  };

  console.log("[OrgShell] Received props", {
    user,
    isSetupComplete,
    organizationLogo,
  });

  useEffect(() => {
    if (!isSetupComplete && !pathname.startsWith("/org/settings")) {
      console.log("⚠️ Setup incomplete. Redirecting to settings...");
      router.replace("/org/settings");
    }
  }, [isSetupComplete, pathname, router]);

  const breadcrumbs = generateBreadcrumbs(pathname);

  // Transform Nav Items for Sidebar
  const transformedNavItems = orgNavItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.iconName,
  }));

  // Icon Map
  const iconMap = orgNavItems.reduce(
    (map, item) => {
      map[item.iconName] = item.icon as React.FC<{ className?: string }>;
      return map;
    },
    {} as Record<string, React.FC<{ className?: string }>>,
  );

  return (
    <SidebarProvider>
      <AppSidebar
        user={userForSidebar}
        navMain={transformedNavItems}
        iconMap={iconMap}
        homeUrl="/org/dashboard"
        brandName="Verch"
        className="border-r border-sidebar-border"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-secondary px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-secondary-foreground hover:bg-secondary-foreground/10" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4 bg-secondary-foreground/20"
            />

            {/* Mobile Logo */}
            <div className="flex items-center gap-2 md:hidden">
              <Image
                src="/logo-verch.webp"
                alt="Verch Logo"
                width={24}
                height={24}
                className="object-contain"
              />
              <span className="font-semibold text-secondary-foreground">
                Organization Panel
              </span>
            </div>

            {/* Breadcrumbs */}
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {breadcrumbs.map((crumb) => (
                  <div key={crumb.href} className="flex items-center">
                    <BreadcrumbItem>
                      {crumb.isLast ? (
                        <BreadcrumbPage className="font-medium text-secondary-foreground">
                          {crumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            href={crumb.href}
                            className="text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                          >
                            {crumb.title}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!crumb.isLast && (
                      <BreadcrumbSeparator className="ml-2 mr-2 text-secondary-foreground/60" />
                    )}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pb-20 md:p-8 md:pb-4">
          <div className="min-h-[100vh] flex-1 rounded-xl border bg-card p-4 md:min-h-min md:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
      <MobileBottomNav links={mobileNavLinks} iconMap={iconMap} />
    </SidebarProvider>
  );
}
