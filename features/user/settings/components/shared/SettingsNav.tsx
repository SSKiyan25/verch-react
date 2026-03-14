"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Phone,
  MapPin,
  GraduationCap,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const settingsNavItems = [
  { label: "Profile", href: "/user/settings/profile", icon: User },
  { label: "Contact", href: "/user/settings/contact", icon: Phone },
  { label: "Addresses", href: "/user/settings/addresses", icon: MapPin },
  {
    label: "Student ID",
    href: "/user/settings/student-id",
    icon: GraduationCap,
  },
  { label: "Memberships", href: "/user/settings/memberships", icon: Users },
  { label: "Security", href: "/user/settings/security", icon: Shield },
];

export function SettingsNav() {
  const pathname = usePathname();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 border-r border-muted pr-4">
        {settingsNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile tab strip */}
      <div className="md:hidden relative">
        {/* Left fade + chevron */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-background via-background/80 to-transparent pr-6 pl-1 transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right fade + chevron */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-background via-background/80 to-transparent pl-6 pr-1 transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </>
  );
}
