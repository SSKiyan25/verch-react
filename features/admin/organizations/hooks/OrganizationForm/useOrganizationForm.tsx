/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { Organization, CreateOrganizationData } from "@/lib/types/organization";

export interface OrganizationFormData {
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
}

const INITIAL_DATA: OrganizationFormData = {
  email: "",
  name: "",
  description: "",
  logoUrl: "",
  contactNumber: "",
  commissionRate: 5.0,
  status: "pending",
  isVerified: false,
  password: "",
  confirmPassword: "",
};

export function useOrganizationForm(
  existingOrganization?: Organization | null
) {
  // Map organization status to form status
  const mapOrgStatusToFormStatus = (
    status: Organization["status"]
  ): "active" | "inactive" | "pending" => {
    switch (status) {
      case "active":
        return "active";
      case "suspended":
      case "archived":
        return "inactive";
      default:
        return "pending";
    }
  };

  const [formData, setFormData] = useState<OrganizationFormData>(() => ({
    ...INITIAL_DATA,
    // If editing, populate from existing organization
    ...(existingOrganization && {
      email: existingOrganization.contact_email,
      name: existingOrganization.name,
      description: existingOrganization.description || "",
      logoUrl: existingOrganization.logo_image_url || "",
      contactNumber: existingOrganization.phone_number || "",
      commissionRate: existingOrganization.settings?.commissionRate || 5.0,
      status: mapOrgStatusToFormStatus(existingOrganization.status),
      isVerified: existingOrganization.is_verified,
      // Don't populate passwords for editing
      password: "",
      confirmPassword: "",
    }),
  }));

  const [errors, setErrors] = useState<
    Partial<Record<keyof OrganizationFormData, string>>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  const setField = useCallback(
    (field: keyof OrganizationFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Validation function
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof OrganizationFormData, string>> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    // Contact number validation
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }

    // Password validation for new organizations only
    if (!existingOrganization) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    // Commission rate validation
    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      newErrors.commissionRate = "Commission rate must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, existingOrganization]);

  // Map form status back to organization status
  const mapFormStatusToOrgStatus = (
    status: "active" | "inactive" | "pending"
  ): Organization["status"] => {
    switch (status) {
      case "active":
        return "active";
      case "inactive":
        return "suspended";
      case "pending":
      default:
        return "draft";
    }
  };

  const getCreateData = useCallback((): CreateOrganizationData => {
    return {
      name: formData.name.trim(),
      contact_email: formData.email.trim(),
      phone_number: formData.contactNumber.trim(),
      description: formData.description.trim(),
      settings: {
        businessHours: {},
        commissionRate: formData.commissionRate,
        autoAcceptOrders: false,
        requireOrderApproval: true,
      },
    };
  }, [formData]);

  const getUpdateData = useCallback((): Partial<Organization> => {
    return {
      name: formData.name.trim(),
      phone_number: formData.contactNumber.trim(),
      description: formData.description.trim(),
      logo_image_url: formData.logoUrl || undefined,
      settings: {
        businessHours: existingOrganization?.settings?.businessHours || {},
        commissionRate: formData.commissionRate,
        autoAcceptOrders:
          existingOrganization?.settings?.autoAcceptOrders || false,
        requireOrderApproval:
          existingOrganization?.settings?.requireOrderApproval || true,
      },
      status: mapFormStatusToOrgStatus(formData.status),
      is_verified: formData.isVerified,
      last_modified: new Date(),
    };
  }, [formData, existingOrganization]);

  const reset = useCallback(() => {
    const resetData = existingOrganization
      ? {
          ...INITIAL_DATA,
          email: existingOrganization.contact_email,
          name: existingOrganization.name,
          description: existingOrganization.description || "",
          logoUrl: existingOrganization.logo_image_url || "",
          contactNumber: existingOrganization.phone_number || "",
          commissionRate: existingOrganization.settings?.commissionRate || 5.0,
          status: mapOrgStatusToFormStatus(existingOrganization.status),
          isVerified: existingOrganization.is_verified,
        }
      : INITIAL_DATA;

    setFormData(resetData);
    setErrors({});
    setIsLoading(false);
  }, [existingOrganization]);

  // API submission method
  const submitForm = useCallback(async (): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    if (!validateForm()) {
      return { success: false, error: "Please fix validation errors" };
    }

    setIsLoading(true);

    try {
      if (existingOrganization) {
        // Update existing organization
        const updateData = getUpdateData();

        const response = await fetch(
          `/api/organizations/${existingOrganization.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update organization");
        }

        return { success: true, data: result.organization };
      } else {
        // Create new organization
        const response = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create organization");
        }

        return { success: true, data: result.organization };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [formData, existingOrganization, validateForm, getUpdateData]);

  return {
    formData,
    errors,
    isLoading,
    isEditing: !!existingOrganization,
    actions: {
      setField,
      setFormData,
      setIsLoading,
      validateForm,
      getCreateData,
      getUpdateData,
      submitForm,
      reset,
    },
  };
}
