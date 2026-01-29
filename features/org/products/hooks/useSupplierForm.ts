"use client";

import { useState, useEffect } from "react";
import {
  Supplier,
  CreateSupplierParams,
  SupplierLink,
} from "@/lib/types/supplier";
import { useValidation } from "@/lib/hooks/use-validation";
import { toast } from "sonner";
import {
  supplierValidationRules,
  validateLinks as validateSupplierLinks,
} from "../utils/supplier-validation";

interface UseSupplierFormProps {
  productId: string;
  organizationId: string;
  currentSupplier?: Supplier | null;
  onSupplierUpdate?: (supplier: Supplier | null) => void;
}

export function useSupplierForm({
  productId,
  organizationId,
  currentSupplier,
  onSupplierUpdate,
}: UseSupplierFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<CreateSupplierParams>({
    name: "",
    description: "",
    contact_number: "",
    contact_email: "",
    address: {
      street: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    },
    links: [],
    organization_id: organizationId,
  });

  const { errors, validateAll, validateSingle, clearError, clearAllErrors } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useValidation(formData, supplierValidationRules as any);

  // Fetch existing suppliers (active and archived)
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        // Fetch active suppliers
        const activeResponse = await fetch(
          `/api/organizations/${organizationId}/products/supplier`
        );
        const activeResult = await activeResponse.json();

        // Fetch archived suppliers
        const archivedResponse = await fetch(
          `/api/organizations/${organizationId}/products/supplier?archived=true`
        );
        const archivedResult = await archivedResponse.json();

        if (activeResponse.ok && activeResult.data) {
          setSuppliers(activeResult.data);
        }

        if (archivedResponse.ok && archivedResult.data) {
          setArchivedSuppliers(archivedResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [organizationId]);

  // Populate form with current supplier data
  useEffect(() => {
    if (currentSupplier) {
      setFormData({
        name: currentSupplier.name,
        description: currentSupplier.description || "",
        contact_number: currentSupplier.contact_number || "",
        contact_email: currentSupplier.contact_email || "",
        address: currentSupplier.address || {
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
        },
        links: currentSupplier.links || [],
        organization_id: organizationId,
      });
      clearAllErrors();
    }
  }, [currentSupplier, organizationId, clearAllErrors]);

  const handleInputChange = (
    field: keyof CreateSupplierParams,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Validate field on change if it has validation rules
    if (supplierValidationRules[field]) {
      validateSingle(field, value);
    } else {
      clearError(field);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleAddLink = () => {
    setFormData((prev) => ({
      ...prev,
      links: [
        ...(prev.links || []),
        {
          type: "website" as const,
          url: "",
          label: "",
        },
      ],
    }));
  };

  const handleLinkChange = (
    index: number,
    field: keyof SupplierLink,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      links: (prev.links || []).map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleRemoveLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index),
    }));
  };

  const handleSelectExistingSupplier = async (supplierId: string) => {
    if (!supplierId) return;

    setSaving(true);
    try {
      // Link existing supplier to product
      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}/edit-product`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: supplierId,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to link supplier");

      // Find the supplier from the list
      const linkedSupplier = suppliers.find((s) => s.id === supplierId);

      toast.success("Supplier linked successfully");

      // Update parent with the linked supplier data
      if (linkedSupplier) {
        onSupplierUpdate?.(linkedSupplier);
      }
    } catch (error) {
      console.error("Failed to link supplier:", error);
      toast.error("Failed to link supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupplier = async () => {
    // Validate all fields
    if (!validateAll(formData)) {
      toast.error("Please fix validation errors");
      return;
    }

    // Validate links separately
    const linksValidation = validateSupplierLinks(formData.links || []);
    if (!linksValidation.isValid) {
      toast.error(linksValidation.error || "Invalid links");
      return;
    }

    setSaving(true);
    try {
      let updatedSupplier: Supplier;

      if (currentSupplier) {
        // Update existing supplier
        const response = await fetch(
          `/api/organizations/${organizationId}/products/supplier/${currentSupplier.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error("Failed to update supplier");

        updatedSupplier = result.data;
        toast.success("Supplier updated successfully");
      } else {
        // Create new supplier
        const response = await fetch(
          `/api/organizations/${organizationId}/products/supplier`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error("Failed to create supplier");

        const newSupplier = result.data;

        // Link supplier to product
        await fetch(
          `/api/organizations/${organizationId}/products/${productId}/edit-product`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier_id: newSupplier.id,
            }),
          }
        );

        updatedSupplier = newSupplier;
        toast.success("Supplier created and linked successfully");
      }

      // Update parent with the new/updated supplier data
      onSupplierUpdate?.(updatedSupplier);
      setIsEditMode(false);
      clearAllErrors();
    } catch (error) {
      console.error("Failed to save supplier:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save supplier"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSupplier = async () => {
    if (!currentSupplier) return;

    setSaving(true);
    try {
      // Unlink supplier from product
      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}/edit-product`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: null,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to remove supplier");

      toast.success("Supplier unlinked from product");

      // Update parent with null supplier
      onSupplierUpdate?.(null);
    } catch (error) {
      console.error("Failed to remove supplier:", error);
      toast.error("Failed to unlink supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveSupplier = async () => {
    if (!currentSupplier) return;

    setArchiving(true);
    try {
      // First, unlink from product
      await fetch(
        `/api/organizations/${organizationId}/products/${productId}/edit-product`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: null,
          }),
        }
      );

      // Then archive the supplier
      const response = await fetch(
        `/api/organizations/${organizationId}/products/supplier/${currentSupplier.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to archive supplier");

      toast.success("Supplier archived successfully");

      // Update parent with null supplier
      onSupplierUpdate?.(null);

      // Refresh supplier lists
      const activeResponse = await fetch(
        `/api/organizations/${organizationId}/products/supplier`
      );
      const activeResult = await activeResponse.json();
      if (activeResponse.ok && activeResult.data) {
        setSuppliers(activeResult.data);
      }

      const archivedResponse = await fetch(
        `/api/organizations/${organizationId}/products/supplier?archived=true`
      );
      const archivedResult = await archivedResponse.json();
      if (archivedResponse.ok && archivedResult.data) {
        setArchivedSuppliers(archivedResult.data);
      }
    } catch (error) {
      console.error("Failed to archive supplier:", error);
      toast.error("Failed to archive supplier");
    } finally {
      setArchiving(false);
    }
  };

  const handleRestoreSupplier = async (supplierId: string) => {
    setSaving(true);
    try {
      // Restore supplier
      const response = await fetch(
        `/api/organizations/${organizationId}/products/supplier/${supplierId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_archived: false,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to restore supplier");

      toast.success("Supplier restored successfully");

      // Refresh supplier lists
      const activeResponse = await fetch(
        `/api/organizations/${organizationId}/products/supplier`
      );
      const activeResult = await activeResponse.json();
      if (activeResponse.ok && activeResult.data) {
        setSuppliers(activeResult.data);
      }

      const archivedResponse = await fetch(
        `/api/organizations/${organizationId}/products/supplier?archived=true`
      );
      const archivedResult = await archivedResponse.json();
      if (archivedResponse.ok && archivedResult.data) {
        setArchivedSuppliers(archivedResult.data);
      }
    } catch (error) {
      console.error("Failed to restore supplier:", error);
      toast.error("Failed to restore supplier");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      contact_number: "",
      contact_email: "",
      address: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
      },
      links: [],
      organization_id: organizationId,
    });
    setSelectedSupplierId("");
    setIsEditMode(false);
    clearAllErrors();
  };

  return {
    formData,
    suppliers,
    archivedSuppliers,
    loadingSuppliers,
    saving,
    archiving,
    isEditMode,
    selectedSupplierId,
    errors,
    setIsEditMode,
    setSelectedSupplierId,
    handleInputChange,
    handleAddressChange,
    handleAddLink,
    handleLinkChange,
    handleRemoveLink,
    handleSelectExistingSupplier,
    handleSaveSupplier,
    handleRemoveSupplier,
    handleArchiveSupplier,
    handleRestoreSupplier,
    resetForm,
  };
}
