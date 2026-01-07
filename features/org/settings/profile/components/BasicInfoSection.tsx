"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Phone,
  FileText,
  Save,
  CheckCircle,
} from "lucide-react";

interface BasicInfoData {
  name: string;
  contact_email: string;
  phone_number: string;
  description: string;
}

interface BasicInfoSectionProps {
  data: BasicInfoData;
  onUpdate: (data: BasicInfoData) => Promise<void>;
  isLoading?: boolean;
  isComplete?: boolean;
}

export function BasicInfoSection({
  data,
  onUpdate,
  isLoading = false,
  isComplete = false,
}: BasicInfoSectionProps) {
  const [formData, setFormData] = useState<BasicInfoData>(data);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setIsEditing(false);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <CardTitle className="flex items-center gap-2">
                Basic Information
                {isComplete && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Organization name, contact details, and description
              </p>
            </div>
          </div>
          <Badge
            variant={isComplete ? "default" : "secondary"}
            className="text-xs w-fit"
          >
            {isComplete ? "Complete" : "Incomplete"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter organization name"
                disabled={!isEditing || isLoading}
                required
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) =>
                  setFormData({ ...formData, contact_email: e.target.value })
                }
                placeholder="contact@organization.com"
                disabled={!isEditing || isLoading}
                required
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
                disabled={!isEditing || isLoading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your organization, services, and what makes you unique..."
              rows={4}
              disabled={!isEditing || isLoading}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Edit Information
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!hasChanges || isLoading}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
