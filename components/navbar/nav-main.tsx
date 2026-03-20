"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ComponentType } from "react";

interface NavItem {
  title: string;
  url: string;
  icon?: string;
}

interface IconMap {
  [key: string]: ComponentType<{ className?: string }>;
}

interface NavMainProps {
  items: NavItem[];
  iconMap: IconMap;
}

export function NavMain({ items, iconMap }: NavMainProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1 px-2">
        <SidebarMenu>
          {items.map((item) => {
            const Icon =
              item.icon && iconMap[item.icon] ? iconMap[item.icon] : null;
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/");

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={`transition-colors py-2.5 w-full ${
                    isActive
                      ? "bg-sidebar-accent/30 text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                      : "hover:bg-sidebar-accent/20 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  }`}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-3 w-full"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
