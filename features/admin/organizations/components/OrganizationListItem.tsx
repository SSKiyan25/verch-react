"use client";

import { Card, CardContent } from "@/components/ui/card";
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
  Package,
  DollarSign,
} from "lucide-react";
import { Organization } from "@/lib/types/organization";

interface OrganizationListItemProps {
  organization: Organization;
  onUpdate: (id: string, updates: Partial<Organization>) => void;
  onDelete: (id: string) => void;
  onEdit: (organization: Organization) => void;
}

export function OrganizationListItem({
  organization,
  onDelete,
  onEdit,
}: OrganizationListItemProps) {
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
    <Card className="hover:shadow-sm transition-shadow border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={organization.logoUrl} alt={organization.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(organization.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Name and Status */}
              <div className="min-w-0">
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

              {/* Stats - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>{organization.totalOrders} orders</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>₱{organization.totalRevenue.toLocaleString()}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent-foreground"
                >
                  {organization.commissionRate}% commission
                </Badge>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 flex-shrink-0"
                  >
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

            {/* Contact Info - Mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm lg:hidden">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{organization.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{organization.contactNumber}</span>
              </div>
            </div>

            {/* Stats - Mobile */}
            <div className="flex items-center gap-4 mt-2 text-sm lg:hidden">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>{organization.totalOrders}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>₱{organization.totalRevenue.toLocaleString()}</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent-foreground"
              >
                {organization.commissionRate}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
