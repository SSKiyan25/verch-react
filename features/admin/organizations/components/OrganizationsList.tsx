"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Building2 } from "lucide-react";
import { Organization, CreateOrganizationData } from "@/lib/types/organization";
import { OrganizationCard } from "./OrganizationCard";
import { OrganizationListItem } from "./OrganizationListItem";
import { OrganizationFormDialog } from "./OrganizationForm/OrganizationFormDialog";

type ViewMode = "cards" | "list";

export function OrganizationsList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching organizations...");

        const response = await fetch("/api/organizations");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch organizations");
        }

        console.log("Organizations fetched:", data.organizations);
        setOrganizations(data.organizations || []);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // const handleCreateOrganization = (newOrg: CreateOrganizationData) => {
  //   console.log("Creating organization:", newOrg);

  //   const organization: Organization = {
  //     id: Date.now().toString(),
  //     name: newOrg.name,
  //     contact_email: newOrg.contact_email,
  //     phone_number: newOrg.phone_number || null,
  //     description: newOrg.description || "",
  //     address: newOrg.address || {},
  //     address_images_url: [],
  //     search_keywords: [],
  //     logo_image_url: "",
  //     logo_image_path: "",
  //     cover_image_url: "",
  //     cover_image_path: "",
  //     images_url: [],
  //     settings: {
  //       businessHours: {},
  //       commissionRate: newOrg.settings?.commissionRate || 5.0,
  //       autoAcceptOrders: false,
  //       requireOrderApproval: true,
  //     },
  //     total_paid: 0,
  //     total_due: 0,
  //     last_payment_date: null,
  //     payment_method: "",
  //     date_created: new Date(),
  //     last_modified: new Date(),
  //     status: "draft",
  //     is_public: false,
  //     is_setup_complete: false,
  //     is_verified: false,
  //     verification: {},
  //   };

  //   setOrganizations((prev) => [organization, ...prev]);
  //   console.log("Organization added to state");
  // };

  const handleUpdateOrganization = (
    id: string,
    updates: Partial<Organization>
  ) => {
    console.log("Updating organization:", id, updates);

    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === id ? { ...org, ...updates, last_modified: new Date() } : org
      )
    );
  };

  const handleDeleteOrganization = (id: string) => {
    console.log("Deleting organization:", id);
    setOrganizations((prev) => prev.filter((org) => org.id !== id));
  };

  const handleFormSubmit = (
    data: CreateOrganizationData | Partial<Organization>
  ) => {
    console.log("Form submitted:", data);

    if (selectedOrganization) {
      // Editing existing organization
      handleUpdateOrganization(
        selectedOrganization.id,
        data as Partial<Organization>
      );
    } else {
      // Creating new organization - this will be handled by the API in the dialog
      // The dialog will call the API and then call this function with the result
      console.log("New organization created via API");
      // Refresh the list to show the new organization
      window.location.reload();
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Organizations
            </h2>
            <p className="text-muted-foreground">Loading organizations...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Organizations
            </h2>
            <p className="text-muted-foreground">
              Manage student organizations and commission rates
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </div>

        {/* Empty State */}
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No organizations found
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Get started by creating your first organization. Organizations
              help you manage student groups and their commission rates.
            </p>
            <Button
              onClick={openCreateDialog}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Organization
            </Button>
          </CardContent>
        </Card>

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
              {organizations.filter((org) => org.is_verified).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₱
              {organizations
                .reduce((sum, org) => sum + org.total_paid, 0)
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
                      (sum, org) => sum + org.settings.commissionRate,
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
