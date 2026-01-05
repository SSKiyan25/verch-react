"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Organization, CreateOrganizationData } from "@/lib/types/organization";
import { OrganizationCard } from "./OrganizationCard";
import { OrganizationListItem } from "./OrganizationListItem";
import { OrganizationFormDialog } from "./OrganizationForm/OrganizationFormDialog";

// Dummy data
const dummyOrganizations: Organization[] = [
  {
    id: "1",
    name: "Student Government Association",
    email: "sga@university.edu",
    contactNumber: "09123456789",
    description:
      "The official student government of the university, organizing various campus events and activities.",
    logoUrl: "https://via.placeholder.com/64",
    isVerified: true,
    commissionRate: 5.0,
    totalOrders: 234,
    totalRevenue: 45600.5,
    createdAt: "2024-01-15",
    status: "active",
  },
  {
    id: "2",
    name: "Engineering Society",
    email: "engsoc@university.edu",
    contactNumber: "09234567890",
    description:
      "A professional organization for engineering students promoting technical excellence.",
    logoUrl: "https://via.placeholder.com/64",
    isVerified: true,
    commissionRate: 4.5,
    totalOrders: 156,
    totalRevenue: 28750.25,
    createdAt: "2024-02-20",
    status: "active",
  },
  {
    id: "3",
    name: "Business Club",
    email: "bizclub@university.edu",
    contactNumber: "09345678901",
    description:
      "Connecting business students with industry professionals and opportunities.",
    logoUrl: "https://via.placeholder.com/64",
    isVerified: false,
    commissionRate: 6.0,
    totalOrders: 89,
    totalRevenue: 12340.0,
    createdAt: "2024-03-10",
    status: "pending",
  },
  {
    id: "4",
    name: "Arts & Culture Society",
    email: "arts@university.edu",
    contactNumber: "09456789012",
    description:
      "Promoting artistic expression and cultural awareness on campus.",
    logoUrl: "https://via.placeholder.com/64",
    isVerified: true,
    commissionRate: 3.5,
    totalOrders: 67,
    totalRevenue: 8950.75,
    createdAt: "2024-03-25",
    status: "inactive",
  },
];

type ViewMode = "cards" | "list";

export function OrganizationsList() {
  const [organizations, setOrganizations] =
    useState<Organization[]>(dummyOrganizations);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);

  const handleCreateOrganization = (newOrg: CreateOrganizationData) => {
    const organization: Organization = {
      ...newOrg,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0],
      totalOrders: 0,
      totalRevenue: 0,
    };
    setOrganizations((prev) => [organization, ...prev]);
  };

  const handleUpdateOrganization = (
    id: string,
    updates: Partial<Organization>
  ) => {
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...updates } : org))
    );
  };

  const handleDeleteOrganization = (id: string) => {
    setOrganizations((prev) => prev.filter((org) => org.id !== id));
  };

  const handleFormSubmit = (
    data: CreateOrganizationData | Partial<Organization>
  ) => {
    if (selectedOrganization) {
      // Editing existing organization
      handleUpdateOrganization(
        selectedOrganization.id,
        data as Partial<Organization>
      );
    } else {
      // Creating new organization
      handleCreateOrganization(data as CreateOrganizationData);
    }
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setSelectedOrganization(null);
  };

  const openCreateDialog = () => {
    setSelectedOrganization(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsFormDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organizations</h2>
          <p className="text-muted-foreground">
            Manage student organizations and commission rates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="rounded-r-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={openCreateDialog}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {organizations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {organizations.filter((org) => org.isVerified).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₱
              {organizations
                .reduce((sum, org) => sum + org.totalRevenue, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {organizations.length > 0
                ? (
                    organizations.reduce(
                      (sum, org) => sum + org.commissionRate,
                      0
                    ) / organizations.length
                  ).toFixed(1)
                : "0"}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              onUpdate={handleUpdateOrganization}
              onDelete={handleDeleteOrganization}
              onEdit={openEditDialog}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {organizations.map((organization) => (
            <OrganizationListItem
              key={organization.id}
              organization={organization}
              onUpdate={handleUpdateOrganization}
              onDelete={handleDeleteOrganization}
              onEdit={openEditDialog}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <OrganizationFormDialog
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogClose}
        organization={selectedOrganization}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
