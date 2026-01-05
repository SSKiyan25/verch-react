"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  PhilippinePeso,
  Package,
} from "lucide-react";
import { Organization } from "@/lib/types/organization";

interface OrganizationCardProps {
  organization: Organization;
  onUpdate: (id: string, updates: Partial<Organization>) => void;
  onDelete: (id: string) => void;
  onEdit: (organization: Organization) => void;
}

export function OrganizationCard({
  organization,
  onDelete,
  onEdit,
}: OrganizationCardProps) {
  const getStatusColor = (status: Organization["status"]) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary border-primary/20";
      case "inactive":
        return "bg-muted text-muted-foreground border-border";
      case "pending":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const handleEdit = () => {
    onEdit(organization);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this organization?")) {
      onDelete(organization.id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={organization.logoUrl} alt={organization.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(organization.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {organization.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={getStatusColor(organization.status)}
                >
                  {organization.status}
                </Badge>
                {organization.isVerified && (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {organization.description}
        </p>

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground truncate">
              {organization.email}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">
              {organization.contactNumber}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Package className="w-3 h-3" />
              Orders
            </div>
            <div className="font-semibold text-foreground">
              {organization.totalOrders}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <PhilippinePeso className="w-3 h-3" />
              Revenue
            </div>
            <div className="font-semibold text-foreground">
              ₱{organization.totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Commission Rate */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Commission Rate</span>
          <Badge
            variant="secondary"
            className="bg-accent/10 text-accent-foreground"
          >
            {organization.commissionRate}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
