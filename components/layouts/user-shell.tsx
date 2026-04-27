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
  ShoppingCart,
  Package,
  Heart,
  Settings,
  Store,
} from "lucide-react";
import { useCartStore } from "@/lib/stores/cart-store";
import { CartBadge } from "@/components/navbar/cart-badge";

const userNavItems = [
  {
    title: "Dashboard",
    url: "/user/dashboard",
    icon: LayoutDashboard,
    iconName: "LayoutDashboard",
  },
  {
    title: "My Orders",
    url: "/user/orders",
    icon: Package,
    iconName: "Package",
  },
  {
    title: "Cart",
    url: "/user/cart",
    icon: ShoppingCart,
    iconName: "ShoppingCart",
  },
  {
    title: "Wishlist",
    url: "/user/wishlist",
    icon: Heart,
    iconName: "Heart",
  },
  {
    title: "Browse Stores",
    url: "/stores",
    icon: Store,
    iconName: "Store",
  },
  {
    title: "Settings",
    url: "/user/settings",
    icon: Settings,
    iconName: "Settings",
  },
];

const mobileNavLinks = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/user/dashboard" },
  { label: "Orders", icon: "Package", href: "/user/orders" },
  { label: "Cart", icon: "ShoppingCart", href: "/user/cart" },
  { label: "Settings", icon: "Settings", href: "/user/settings" },
];

interface UserShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  hasCompletedOnboarding: boolean;
  cartCount: number;
}

export function UserShell({
  children,
  user,
  hasCompletedOnboarding,
  cartCount,
}: UserShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setCount = useCartStore((s) => s.setCount);

  // Seed store with server value on mount and whenever server revalidates
  useEffect(() => {
    setCount(cartCount);
  }, [cartCount, setCount]);

  // console.log("UserShell render - cartCount:", cartCount);

  // Gate: if onboarding incomplete, only allow /user/settings/contact
  useEffect(() => {
    if (!hasCompletedOnboarding && !pathname.startsWith("/user/settings")) {
      router.replace("/user/settings/contact");
    }
  }, [hasCompletedOnboarding, pathname, router]);

  // Patch: Ensure 'Settings' appears in breadcrumbs for /user/settings/*
  let breadcrumbs = generateBreadcrumbs(pathname);
  if (pathname.startsWith("/user/settings/") && breadcrumbs.length > 1) {
    // Replace the first breadcrumb ("User") with "Settings"
    breadcrumbs = [
      {
        ...breadcrumbs[0],
        title: "Settings",
        href: "/user/settings",
        isLast: false,
      },
      ...breadcrumbs
        .slice(1)
        .map((crumb, idx, arr) =>
          idx === arr.length - 1 ? { ...crumb, isLast: true } : crumb,
        ),
    ];
  }

  const transformedNavItems = userNavItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.iconName,
  }));

  const iconMap = userNavItems.reduce(
    (map, item) => {
      map[item.iconName] = item.icon as React.FC<{ className?: string }>;
      return map;
    },
    {} as Record<string, React.FC<{ className?: string }>>,
  );

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        navMain={transformedNavItems}
        iconMap={iconMap}
        homeUrl="/"
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
                My Account
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

          {/* Cart icon — always visible; UserShell is only rendered for authenticated users */}
          <Link
            href="/user/cart"
            aria-label="Cart"
            className="relative ml-auto inline-flex items-center justify-center rounded-md p-2 text-secondary-foreground hover:bg-secondary-foreground/10 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            <CartBadge />
          </Link>
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
