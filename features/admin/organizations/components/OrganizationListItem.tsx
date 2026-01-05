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
  PhilippinePeso,
  Percent,
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
      case "suspended":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending_verification":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            <AvatarImage
              src={organization.logo_image_url || undefined}
              alt={organization.name}
            />
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
                    {organization.status.replace("_", " ")}
                  </Badge>
                  {organization.is_verified && (
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
                {(organization.total_paid > 0 ||
                  organization.total_due > 0) && (
                  <>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <PhilippinePeso className="w-4 h-4" />
                      <span>
                        Paid: ₱{organization.total_paid.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <PhilippinePeso className="w-4 h-4" />
                      <span>
                        Due: ₱{organization.total_due.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent-foreground"
                >
                  <Percent className="w-3 h-3 mr-1" />
                  {organization.settings.commissionRate}% commission
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

            {/* Contact Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{organization.contact_email}</span>
              </div>
              {organization.phone_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{organization.phone_number}</span>
                </div>
              )}
            </div>

            {/* Stats - Mobile */}
            <div className="flex items-center gap-4 mt-2 text-sm lg:hidden">
              {(organization.total_paid > 0 || organization.total_due > 0) && (
                <>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <PhilippinePeso className="w-4 h-4" />
                    <span>₱{organization.total_paid.toLocaleString()}</span>
                  </div>
                  <div className="text-muted-foreground">|</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Due: ₱{organization.total_due.toLocaleString()}</span>
                  </div>
                </>
              )}
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent-foreground"
              >
                <Percent className="w-3 h-3 mr-1" />
                {organization.settings.commissionRate}%
              </Badge>
            </div>

            {/* Creation Date */}
            <div className="text-xs text-muted-foreground mt-2">
              Created:{" "}
              {new Date(organization.date_created).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
