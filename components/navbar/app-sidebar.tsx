/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Image from "next/image";
import { LayoutDashboard, List, ChartBar } from "lucide-react";
import { NavUser } from "./nav-user";
import { NavMain } from "./nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
// import Image from "next/image";
import Link from "next/link";

// Define types for the user and nav items
interface User {
  name?: string;
  email?: string;
  image?: string;
  avatar?: string; // Add avatar property
}

interface NavItem {
  title: string;
  url: string;
  icon?: string;
}

interface IconMap {
  [key: string]: React.ComponentType<any>;
}

interface AppSidebarProps {
  user: User;
  navMain: NavItem[];
  iconMap?: IconMap;
  homeUrl?: string;
  brandName?: string;
  className?: string; // Add className prop
}

// Default icon map if not provided
const defaultIconMap: IconMap = {
  "layout-dashboard": LayoutDashboard,
  "list-details": List,
  "chart-bar": ChartBar,
};

export function AppSidebar({
  user,
  navMain,
  iconMap = defaultIconMap,
  className,
  homeUrl = "/",
  brandName = "Verch",
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className={`bg-white border-r border-sidebar-border ${className || ""}`}
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-sidebar-accent/20 transition-colors"
            >
              <Link
                href={homeUrl}
                className="flex items-center gap-2 p-4 py-6.5"
              >
                <Image
                  src="/logo-verch.webp"
                  alt=""
                  width={36}
                  height={36}
                  className="text-primary"
                />
                <span className="text-3xl font-semibold text-primary">
                  {brandName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="py-2">
        <NavMain items={navMain} iconMap={iconMap} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 mt-auto">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
