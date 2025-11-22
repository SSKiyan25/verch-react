import { LayoutDashboard, Building2, Users, Settings } from "lucide-react";

export const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Organizations",
    url: "/admin/organizations",
    icon: Building2,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export const adminUser = {
  name: "Admin User",
  email: "admin@verch.com",
  avatar: "",
};
