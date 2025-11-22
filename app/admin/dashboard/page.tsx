"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  ShoppingBag,
  TrendingUp,
  Plus,
  MoreHorizontal,
} from "lucide-react";

export default function AdminDashboard() {
  // Temporary data
  const stats = [
    {
      title: "Total Organizations",
      value: "12",
      change: "+2 this month",
      icon: Building2,
      trend: "up",
    },
    {
      title: "Total Users",
      value: "1,234",
      change: "+15% from last month",
      icon: Users,
      trend: "up",
    },
    {
      title: "Products Listed",
      value: "89",
      change: "+5 this week",
      icon: ShoppingBag,
      trend: "up",
    },
    {
      title: "Revenue",
      value: "₱12,450",
      change: "+8% from last month",
      icon: TrendingUp,
      trend: "up",
    },
  ];

  const recentOrganizations = [
    {
      id: 1,
      name: "VSU Student Council",
      status: "verified",
      products: 15,
      joinedDate: "Nov 15, 2024",
    },
    {
      id: 2,
      name: "Engineering Society",
      status: "pending",
      products: 8,
      joinedDate: "Nov 18, 2024",
    },
    {
      id: 3,
      name: "Business Club",
      status: "verified",
      products: 12,
      joinedDate: "Nov 20, 2024",
    },
  ];

  const recentUsers = [
    {
      id: 1,
      name: "John Doe",
      email: "john@vsu.edu.ph",
      role: "customer",
      joinedDate: "Nov 22, 2024",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@vsu.edu.ph",
      role: "customer",
      joinedDate: "Nov 21, 2024",
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike@vsu.edu.ph",
      role: "organization",
      joinedDate: "Nov 20, 2024",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with Verch today.
          </p>
        </div>
        <Button className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Quick Action
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Organizations</CardTitle>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.products} products • Joined {org.joinedDate}
                    </p>
                  </div>
                  <Badge
                    variant={
                      org.status === "verified" ? "default" : "secondary"
                    }
                  >
                    {org.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Users</CardTitle>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email} • Joined {user.joinedDate}
                    </p>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="h-6 w-6 mb-2" />
              Manage Organizations
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              View All Users
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <ShoppingBag className="h-6 w-6 mb-2" />
              Product Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
