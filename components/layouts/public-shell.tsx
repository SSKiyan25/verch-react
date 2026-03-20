"use client";

import { SiteHeader } from "@/components/navbar/site-header";
import { MobileBottomNav } from "@/components/navbar/mobile-bottom-nav";
import {
  Home as HomeIcon,
  ShoppingBag,
  Store,
  LogIn,
  ShoppingCart as CartIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCartStore } from "@/lib/stores/cart-store";
import { CartBadge } from "@/components/navbar/cart-badge";
import { useEffect } from "react";

// Define mobile icon map
const mobileIconMap = {
  home: HomeIcon,
  products: ShoppingBag,
  stores: Store,
  login: LogIn,
  cart: CartIcon,
};

interface PublicShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  } | null;
  cartCount: number;
}

export function PublicShell({ children, user, cartCount }: PublicShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const setCount = useCartStore((s) => s.setCount);

  // Seed store with server value on mount and whenever server revalidates
  useEffect(() => {
    setCount(cartCount);
  }, [cartCount, setCount]);

  console.log("UserShell render - cartCount:", cartCount);
  // Custom navigation links for desktop
  const customNavigation = (
    <nav className="flex items-center space-x-6">
      <Link
        href="/"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Home
      </Link>
      <Link
        href="/products"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Products
      </Link>
      <Link
        href="/stores"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Stores
      </Link>
    </nav>
  );

  // Custom auth section
  const customAuthSection = user ? (
    <div className="flex items-center gap-1">
      {/* Cart icon — only rendered when user is authenticated */}
      <Link
        href="/user/cart"
        aria-label="Cart"
        className="relative inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent transition-colors"
      >
        <CartIcon className="h-5 w-5" />
        <CartBadge />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center space-x-2 h-auto p-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {user.role.replace(/_/g, " ")}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/user/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/orders" className="cursor-pointer">
              <Package className="mr-2 h-4 w-4" />
              <span>Orders</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/cart" className="cursor-pointer">
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Cart</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <Button asChild>
      <Link href="/login">Login</Link>
    </Button>
  );

  // Navigation links for mobile bottom nav
  const navLinks = [
    {
      label: "Home",
      icon: "home" as const,
      href: "/",
    },
    {
      label: "Products",
      icon: "products" as const,
      href: "/products",
    },
    {
      label: "Stores",
      icon: "stores" as const,
      href: "/stores",
    },
    ...(user
      ? [
          {
            label: "Cart",
            icon: "cart" as const,
            href: "/user/cart",
          },
        ]
      : [
          {
            label: "Login",
            icon: "login" as const,
            href: "/login",
          },
        ]),
  ];

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader
          user={user}
          isAuthenticated={!!user}
          brandName="Verch"
          logoSrc="/logo-verch.webp"
          logoAlt="Verch Logo"
          homeUrl="/"
          loginUrl="/login"
          dashboardUrl="/user/dashboard"
          profileUrl="/user/profile"
          settingsUrl="/user/settings"
          onLogout={handleLogout}
          customAuthSection={customAuthSection}
          customNavigation={customNavigation}
        />
        <main className="flex-1 p-2 sm:p-4 pb-16 md:pb-4">{children}</main>
        <MobileBottomNav links={navLinks} iconMap={mobileIconMap} />
      </div>
    </div>
  );
}
