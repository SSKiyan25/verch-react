"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import React from "react";

// Accept either LucideIcon or a function component that returns JSX
type IconType = LucideIcon | React.FC<{ className?: string }>;

interface IconMap {
  [key: string]: IconType;
}

interface NavLink {
  label: string;
  icon: string;
  href: string;
}

interface MobileBottomNavProps {
  links: NavLink[];
  iconMap: IconMap;
}

export function MobileBottomNav({ links, iconMap }: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg md:hidden">
      <div className="flex justify-around items-center py-2 px-4">
        {links.map(({ label, icon, href }) => {
          const Icon = iconMap[icon];
          const isActive = pathname === href || pathname.startsWith(href + "/");

          return Icon ? (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="w-5 h-5 mb-1 shrink-0" />
              <span className="text-xs font-medium truncate">{label}</span>
            </Link>
          ) : null;
        })}
      </div>
    </nav>
  );
}
