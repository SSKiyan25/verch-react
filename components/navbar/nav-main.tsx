"use client";

import Link from "next/link";
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
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1 px-2">
        <SidebarMenu>
          {items.map((item) => {
            const Icon =
              item.icon && iconMap[item.icon] ? iconMap[item.icon] : null;
            return (
              <SidebarMenuItem key={item.title}>
                <Link href={item.url} className="w-full">
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="transition-colors py-2.5 hover:bg-sidebar-accent/20 data-[active=true]:bg-sidebar-accent/30 data-[active=true]:text-muted-foreground w-full"
                  >
                    {Icon && <Icon className="mr-3 text-muted-foreground/70" />}
                    <span className="font-medium text-muted-foreground">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
