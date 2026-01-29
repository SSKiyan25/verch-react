"use client";

import { CreateSupplierParams, SupplierLink } from "@/lib/types/supplier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Truck, Plus, Loader2, Trash2 } from "lucide-react";
import { ValidationErrors } from "@/lib/hooks/use-validation";

interface SupplierFormProps {
  formData: CreateSupplierParams;
  errors: ValidationErrors;
  isEditMode: boolean;
  isSaving: boolean;
  onInputChange: (field: keyof CreateSupplierParams, value: string) => void;
  onAddressChange: (field: string, value: string) => void;
  onAddLink: () => void;
  onLinkChange: (
    index: number,
    field: keyof SupplierLink,
    value: string
  ) => void;
  onRemoveLink: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SupplierForm({
  formData,
  errors,
  isEditMode,
  isSaving,
  onInputChange,
  onAddressChange,
  onAddLink,
  onLinkChange,
  onRemoveLink,
  onSave,
  onCancel,
}: SupplierFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            {isEditMode ? "Edit Supplier" : "Create New Supplier"}
          </CardTitle>
          {isEditMode && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-2">
          <Label htmlFor="supplier-name">Supplier Name *</Label>
          <Input
            id="supplier-name"
            placeholder="ABC Trading Co."
            value={formData.name}
            onChange={(e) => onInputChange("name", e.target.value)}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description about the supplier..."
            value={formData.description}
            onChange={(e) => onInputChange("description", e.target.value)}
            rows={3}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="supplier@company.com"
              value={formData.contact_email}
              onChange={(e) => onInputChange("contact_email", e.target.value)}
              className={errors.contact_email ? "border-red-500" : ""}
            />
            {errors.contact_email && (
              <p className="text-sm text-red-600">{errors.contact_email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              placeholder="+63 912 345 6789"
              value={formData.contact_number}
              onChange={(e) => onInputChange("contact_number", e.target.value)}
              className={errors.contact_number ? "border-red-500" : ""}
            />
            {errors.contact_number && (
              <p className="text-sm text-red-600">{errors.contact_number}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Address */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Address</Label>

          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              placeholder="123 Business St"
              value={formData.address?.street || ""}
              onChange={(e) => onAddressChange("street", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Makati City"
                value={formData.address?.city || ""}
                onChange={(e) => onAddressChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                placeholder="Metro Manila"
                value={formData.address?.state || ""}
                onChange={(e) => onAddressChange("state", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code</Label>
              <Input
                id="postal-code"
                placeholder="1200"
                value={formData.address?.postal_code || ""}
                onChange={(e) => onAddressChange("postal_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Philippines"
                value={formData.address?.country || ""}
                onChange={(e) => onAddressChange("country", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Links */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddLink}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>

          {formData.links && formData.links.length > 0 && (
            <div className="space-y-3">
              {formData.links.map((link, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-start p-3 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <Select
                      value={link.type}
                      onValueChange={(value) =>
                        onLinkChange(index, "type", value)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) =>
                        onLinkChange(index, "url", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={link.label || ""}
                      onChange={(e) =>
                        onLinkChange(index, "label", e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveLink(index)}
                    className="text-red-600 hover:text-red-700 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={onSave}
            disabled={isSaving || !formData.name.trim()}
            className="flex-1 sm:flex-initial"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {isEditMode ? "Update Supplier" : "Create Supplier"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
