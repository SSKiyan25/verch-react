/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { Organization, CreateOrganizationData } from "@/lib/types/organization";

export interface OrganizationFormData {
  email: string;
  isEmailVerified: boolean;
  name: string;
  description: string;
  logoUrl: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
  commissionRate: number;
  status: Organization["status"];
  isVerified: boolean;
}

const INITIAL_DATA: OrganizationFormData = {
  email: "",
  isEmailVerified: false,
  name: "",
  description: "",
  logoUrl: "",
  contactNumber: "",
  password: "",
  confirmPassword: "",
  commissionRate: 5.0,
  status: "pending",
  isVerified: false,
};

export function useOrganizationForm(
  existingOrganization?: Organization | null
) {
  const [formData, setFormData] = useState<OrganizationFormData>(() => ({
    ...INITIAL_DATA,
    // If editing, populate from existing organization
    ...(existingOrganization && {
      email: existingOrganization.email,
      name: existingOrganization.name,
      description: existingOrganization.description,
      logoUrl: existingOrganization.logoUrl || "",
      contactNumber: existingOrganization.contactNumber,
      commissionRate: existingOrganization.commissionRate,
      status: existingOrganization.status,
      isVerified: existingOrganization.isVerified,
      password: "", // Don't populate passwords for editing
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

  // Simple validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof OrganizationFormData, string>> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.isEmailVerified) {
      newErrors.email = "Email must be verified";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }

    // Password validation for new organizations
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

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      newErrors.commissionRate = "Commission rate must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, existingOrganization]);

  const getCreateData = useCallback((): CreateOrganizationData => {
    return {
      name: formData.name.trim(),
      email: formData.email.trim(),
      contactNumber: formData.contactNumber.trim(),
      description: formData.description.trim(),
      logoUrl: formData.logoUrl.trim() || undefined,
      commissionRate: formData.commissionRate,
      status: formData.status,
      isVerified: formData.isVerified,
    };
  }, [formData]);

  const getUpdateData = useCallback((): Partial<Organization> => {
    return {
      name: formData.name.trim(),
      contactNumber: formData.contactNumber.trim(),
      description: formData.description.trim(),
      logoUrl: formData.logoUrl.trim() || undefined,
      commissionRate: formData.commissionRate,
      status: formData.status,
      isVerified: formData.isVerified,
    };
  }, [formData]);

  const reset = useCallback(() => {
    const resetData = existingOrganization
      ? {
          ...INITIAL_DATA,
          email: existingOrganization.email,
          name: existingOrganization.name,
          description: existingOrganization.description,
          logoUrl: existingOrganization.logoUrl || "",
          contactNumber: existingOrganization.contactNumber,
          commissionRate: existingOrganization.commissionRate,
          status: existingOrganization.status,
          isVerified: existingOrganization.isVerified,
        }
      : INITIAL_DATA;

    setFormData(resetData);
    setErrors({});
  }, [existingOrganization]);

  return {
    formData,
    errors,
    isLoading,
    actions: {
      setField,
      setIsLoading,
      validateForm,
      getCreateData,
      getUpdateData,
      reset,
    },
  };
}
