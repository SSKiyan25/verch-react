"use client";
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
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";

// Organization navigation items
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
  {
    title: "Members",
    url: "/org/members",
    icon: Users,
    iconName: "Users",
  },
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

// Mobile bottom nav links
const mobileNavLinks = [
  {
    label: "Dashboard",
    icon: "LayoutDashboard",
    href: "/org/dashboard",
  },
  {
    label: "Products",
    icon: "Package",
    href: "/org/products",
  },
  {
    label: "Orders",
    icon: "ShoppingCart",
    href: "/org/orders",
  },
  {
    label: "Settings",
    icon: "Settings",
    href: "/org/settings",
  },
];

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Helper function to check if user has organization role
  const isOrganizationUser = (userRole: string) => {
    return [
      "organization_admin",
      "organization_manager",
      "organization_staff",
    ].includes(userRole);
  };

  // Helper function to check if a segment looks like an ID
  const isIdSegment = (segment: string) => {
    // Check if segment looks like an ID (UUID, numeric ID, or common ID patterns)
    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      ) || // UUID
      /^\d+$/.test(segment) || // Numeric ID
      /^[a-zA-Z]+-\d+$/.test(segment) || // Pattern like "prod-123"
      /^[a-zA-Z0-9]{8,}$/.test(segment)
    ); // Long alphanumeric strings
  };

  // Fetch organization data and check setup status
  useEffect(() => {
    const checkAuthAndSetup = async () => {
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

      // If user exists but not organization role, redirect to login
      if (!isOrganizationUser(user.role)) {
        console.log(
          `User role is ${user.role}, not organization role. Redirecting to login`
        );
        router.replace("/login");
        return;
      }

      // Check if user has organization_id and it's valid
      if (
        !user.organization_id ||
        user.organization_id === "undefined" ||
        user.organization_id === ""
      ) {
        console.error(
          "User does not have a valid organization_id set:",
          user.organization_id
        );
        router.replace("/login");
        return;
      }

      console.log("Organization user authenticated successfully");

      try {
        // Fetch organization data to check setup status
        const response = await fetch(
          `/api/organizations/${user.organization_id}`
        );
        const data = await response.json();

        if (response.ok && data.organization) {
          // Update organization status from draft to active if needed
          if (data.organization.status === "draft") {
            console.log("Organization status is draft, updating to active...");

            try {
              const updateResponse = await fetch(
                `/api/organizations/${user.organization_id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "active" }),
                }
              );

              if (updateResponse.ok) {
                console.log("Organization status updated to active");
              }
            } catch (error) {
              console.error("Error updating organization status:", error);
            }
          }

          // Check if setup is complete
          const isSetupComplete = data.organization.is_setup_complete;
          console.log("Setup complete status:", isSetupComplete);

          // If setup is not complete and not already on settings page, redirect to settings
          if (!isSetupComplete && !pathname.startsWith("/org/settings")) {
            console.log("Setup not complete, redirecting to settings");
            router.replace("/org/settings");
            return;
          }

          // If setup is complete and trying to access settings for the first time, allow it
          setIsCheckingAuth(false);
        } else {
          console.error("Failed to fetch organization data:", data.error);
          // If organization data not found, redirect to login
          router.replace("/login");
          return;
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
        // On error, still allow access but set checking to false
        setIsCheckingAuth(false);
      }
    };

    // Small delay to ensure auth state is fully loaded
    const timeoutId = setTimeout(checkAuthAndSetup, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, loading, router, pathname]);

  // Generate breadcrumbs from pathname, excluding "org" and IDs
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    // Skip the first segment if it's "org"
    const startIndex = segments[0] === "org" ? 1 : 0;

    // Keep track of the path as we build breadcrumbs
    let currentPath = "/org";

    for (let i = startIndex; i < segments.length; i++) {
      const segment = segments[i];

      // Add segment to current path regardless
      currentPath += `/${segment}`;

      // Skip ID-like segments for display, but continue building path
      if (isIdSegment(segment)) {
        continue;
      }

      // For non-ID segments, create a breadcrumb
      // But use the base path for linking (without the ID)
      let href = currentPath;

      // If this follows an ID segment, link to the parent section
      if (i > 0 && isIdSegment(segments[i - 1])) {
        // Remove the ID from the href for linking
        const pathParts = currentPath.split("/").filter(Boolean);
        const cleanParts = pathParts.filter((part) => !isIdSegment(part));
        href = "/" + cleanParts.join("/");
      }

      const title = segment.charAt(0).toUpperCase() + segment.slice(1);

      breadcrumbs.push({
        title,
        href,
        isLast: i === segments.length - 1,
      });
    }

    return breadcrumbs;
  };

  // Show loading state while checking authentication and setup
  if (loading || isCheckingAuth) {
    return <LoadingScreen message="Authenticating organization access..." />;
  }

  // Don't render if no user or not organization role
  if (!user || !isOrganizationUser(user.role)) {
    return <LoadingScreen message="Redirecting..." />;
  }

  // Transform orgNavItems to match AppSidebar's expected format
  const transformedNavItems = orgNavItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.iconName,
  }));

  // Create iconMap from the original orgNavItems with proper typing
  const iconMap = orgNavItems.reduce((map, item) => {
    map[item.iconName] = item.icon as React.FC<{ className?: string }>;
    return map;
  }, {} as Record<string, React.FC<{ className?: string }>>);

  const breadcrumbs = generateBreadcrumbs();

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
        homeUrl="/org/dashboard"
        brandName="Verch"
        className="border-r border-sidebar-border"
      />
      <SidebarInset>
        {/* Header with breadcrumbs */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-secondary border-b border-border">
          <div className="flex items-center gap-2 px-4">
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

            {/* Breadcrumbs - Hidden on mobile */}
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {breadcrumbs
                  .map((crumb, index) => [
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
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 pb-20 md:pb-4">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-card md:min-h-min p-4 md:p-6 border">
            {children}
          </div>
        </div>
      </SidebarInset>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav links={mobileNavLinks} iconMap={iconMap} />
    </SidebarProvider>
  );
}
