/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  ArrowLeft,
  Save,
  Plus,
  Eye,
  EyeOff,
  Phone,
  FileText,
  Lock,
  Settings,
} from "lucide-react";
import { validatePassword } from "../../../utils/formValidation";

interface DetailsStepProps {
  formData: {
    email: string;
    name: string;
    description: string;
    logoUrl: string;
    contactNumber: string;
    commissionRate: number;
    status: "active" | "inactive" | "pending";
    isVerified: boolean;
    password: string;
    confirmPassword: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isEditing: boolean;
  onSubmit: (data: any) => void;
  onPrev?: () => void;
}

export function DetailsStep({
  formData,
  setFormData,
  isEditing,
  onSubmit,
  onPrev,
}: DetailsStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0];
        }
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Pass the form data to parent - no simulation needed
      onSubmit(formData);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing ? "Update Organization Details" : "Organization Details"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {isEditing
            ? "Update your organization information"
            : "Set up your organization profile and security"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">Basic Information</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter organization name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your organization..."
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">
                Contact Information
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  ✅ Email verified - cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      contactNumber: e.target.value,
                    }))
                  }
                  placeholder="09123456789"
                />
                {errors.contactNumber && (
                  <p className="text-sm text-destructive">
                    {errors.contactNumber}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security - Only for new organizations */}
        {!isEditing && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-foreground">Security</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Enter a strong password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {formData.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              passwordValidation.score >= level
                                ? passwordValidation.strength === "weak"
                                  ? "bg-destructive"
                                  : passwordValidation.strength === "fair"
                                  ? "bg-amber-500"
                                  : passwordValidation.strength === "good"
                                  ? "bg-blue-500"
                                  : "bg-primary"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        Password strength: {passwordValidation.strength}
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm your password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">
                Organization Settings
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      commissionRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Default commission rate for orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          {onPrev && (
            <Button
              variant="outline"
              onClick={onPrev}
              disabled={isLoading}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              isEditing ? (
                "Updating..."
              ) : (
                "Creating..."
              )
            ) : (
              <>
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Organization
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
