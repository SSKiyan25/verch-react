"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  createSupplierAction,
  updateSupplierAction,
  archiveSupplierAction,
  linkSupplierToProductAction,
  restoreSupplierAction,
  getOrgSuppliersAction,
} from "@/features/org/products/actions/supplierActions";
// import { updateProductAction } from "@/features/org/products/actions/productActions";

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
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

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

  // ─── Fetch suppliers via Server Actions (no REST API calls) ──────────────────

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const [activeResult, archivedResult] = await Promise.all([
        getOrgSuppliersAction(organizationId, false),
        getOrgSuppliersAction(organizationId, true),
      ]);

      if (activeResult.success && activeResult.data) {
        // Active result includes all (active + archived when includeArchived=true),
        // so we always pass the correct flag. Filter just in case.
        setSuppliers(
          (activeResult.data as unknown as Supplier[]).filter(
            (s) => !s.is_archived,
          ),
        );
      } else if (!activeResult.success) {
        console.error(
          "[useSupplierForm] fetchSuppliers (active):",
          activeResult.error,
        );
      }

      if (archivedResult.success && archivedResult.data) {
        setArchivedSuppliers(
          (archivedResult.data as unknown as Supplier[]).filter(
            (s) => s.is_archived,
          ),
        );
      } else if (!archivedResult.success) {
        console.error(
          "[useSupplierForm] fetchSuppliers (archived):",
          archivedResult.error,
        );
      }
    } catch (error) {
      console.error(
        "[useSupplierForm] fetchSuppliers unexpected error:",
        error,
      );
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // 1. Calculate the enriched supplier right here so we can return it to the view
  const enrichedSupplier =
    suppliers.find((s) => s.id === currentSupplier?.id) ||
    archivedSuppliers.find((s) => s.id === currentSupplier?.id) ||
    currentSupplier;

  // ─── Populate form when editing existing supplier ────────────────────────────
  useEffect(() => {
    if (enrichedSupplier) {
      setFormData({
        name: enrichedSupplier.name || "",
        description: enrichedSupplier.description || "",
        contact_number: enrichedSupplier.contact_number || "",
        contact_email: enrichedSupplier.contact_email || "",
        address: enrichedSupplier.address || {
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
        },
        links: enrichedSupplier.links || [],
        organization_id: organizationId,
      });
      // It is safe to call this here, but we MUST NOT include it in the deps array below
      clearAllErrors();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentSupplier?.id,
    suppliers,
    archivedSuppliers,
    organizationId,
    // REMOVED clearAllErrors to stop the infinite loop!
  ]);

  // ─── Form field handlers ──────────────────────────────────────────────────────

  const handleInputChange = (
    field: keyof CreateSupplierParams,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (supplierValidationRules[field]) {
      validateSingle(field, value);
    } else {
      clearError(field);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const handleAddLink = () => {
    setFormData((prev) => ({
      ...prev,
      links: [
        ...(prev.links || []),
        { type: "website" as const, url: "", label: "" },
      ],
    }));
  };

  const handleLinkChange = (
    index: number,
    field: keyof SupplierLink,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      links: (prev.links || []).map((link, i) =>
        i === index ? { ...link, [field]: value } : link,
      ),
    }));
  };

  const handleRemoveLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index),
    }));
  };

  // ─── Link existing supplier to product ───────────────────────────────────────

  const handleSelectExistingSupplier = async (supplierId: string) => {
    if (!supplierId) return;

    setSaving(true);
    try {
      const result = await linkSupplierToProductAction(
        organizationId,
        productId,
        { supplier_id: supplierId },
      );

      if (!result.success) {
        toast.error(result.error || "Failed to link supplier");
        return;
      }

      const linkedSupplier = suppliers.find((s) => s.id === supplierId);
      toast.success("Supplier linked successfully");
      router.refresh();
      if (linkedSupplier) {
        onSupplierUpdate?.(linkedSupplier);
      }
    } catch (error) {
      console.error("[useSupplierForm] handleSelectExistingSupplier:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to link supplier",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Save (create or update) supplier ────────────────────────────────────────

  const handleSaveSupplier = async () => {
    if (!validateAll(formData)) {
      toast.error("Please fix validation errors");
      return;
    }

    const linksValidation = validateSupplierLinks(formData.links || []);
    if (!linksValidation.isValid) {
      toast.error(linksValidation.error || "Invalid links");
      return;
    }

    setSaving(true);
    try {
      let updatedSupplier: Supplier;

      if (currentSupplier) {
        // ── Update existing supplier ──────────────────────────────────────────
        const result = await updateSupplierAction(
          organizationId,
          currentSupplier.id,
          {
            ...formData,
            address: formData.address as unknown as Record<string, unknown>,
          },
        );

        if (!result.success) {
          toast.error(result.error || "Failed to update supplier");
          return;
        }

        updatedSupplier = result.data as unknown as Supplier;
        toast.success("Supplier updated successfully");
      } else {
        // ── Create new supplier, then link it ─────────────────────────────────
        const createResult = await createSupplierAction(organizationId, {
          ...formData,
          address: (formData.address || {}) as Record<string, unknown>,
          links: (formData.links || []) as unknown[],
        });

        if (!createResult.success) {
          toast.error(createResult.error || "Failed to create supplier");
          return;
        }

        const newSupplier = createResult.data as unknown as Supplier;

        const linkResult = await linkSupplierToProductAction(
          organizationId,
          productId,
          { supplier_id: newSupplier.id },
        );

        if (!linkResult.success) {
          // Supplier was created but linking failed — surface error so user can
          // link manually from the selector without losing the new supplier.
          toast.error(
            linkResult.error ||
              "Supplier created but could not be linked — try linking it from the selector",
          );
          // Refresh supplier list so the new supplier appears in the selector
          await fetchSuppliers();
          return;
        }

        updatedSupplier = newSupplier;
        toast.success("Supplier created and linked successfully");
      }

      router.refresh();
      onSupplierUpdate?.(updatedSupplier);
      setIsEditMode(false);
      clearAllErrors();
    } catch (error) {
      console.error("[useSupplierForm] handleSaveSupplier:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save supplier",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Unlink supplier from product ────────────────────────────────────────────

  const handleRemoveSupplier = async () => {
    if (!currentSupplier) return;

    setSaving(true);
    try {
      // Use linkSupplierToProductAction with null to unlink cleanly via RPC
      const result = await linkSupplierToProductAction(
        organizationId,
        productId,
        { supplier_id: null },
      );

      if (!result.success) {
        toast.error(result.error || "Failed to remove supplier");
        return;
      }

      toast.success("Supplier unlinked from product");
      router.refresh();
      onSupplierUpdate?.(null);
    } catch (error) {
      console.error("[useSupplierForm] handleRemoveSupplier:", error);
      toast.error("Failed to unlink supplier");
    } finally {
      setSaving(false);
    }
  };

  // ─── Archive supplier (unlink + archive) ─────────────────────────────────────

  const handleArchiveSupplier = async () => {
    if (!currentSupplier) return;

    setArchiving(true);
    try {
      // 1. Unlink from product first
      const unlinkResult = await linkSupplierToProductAction(
        organizationId,
        productId,
        { supplier_id: null },
      );

      if (!unlinkResult.success) {
        toast.error(
          unlinkResult.error || "Failed to unlink supplier before archiving",
        );
        return;
      }

      // 2. Archive the supplier
      const archiveResult = await archiveSupplierAction(
        organizationId,
        currentSupplier.id,
      );

      if (!archiveResult.success) {
        // Supplier was unlinked but not archived — tell the user what happened
        toast.error(
          archiveResult.error || "Supplier unlinked but could not be archived",
        );
        router.refresh();
        onSupplierUpdate?.(null);
        return;
      }

      toast.success("Supplier archived successfully");
      router.refresh();
      onSupplierUpdate?.(null);

      // Refresh local supplier lists so the archived supplier moves correctly
      await fetchSuppliers();
    } catch (error) {
      console.error("[useSupplierForm] handleArchiveSupplier:", error);
      toast.error("Failed to archive supplier");
    } finally {
      setArchiving(false);
    }
  };

  // ─── Restore archived supplier ────────────────────────────────────────────────

  const handleRestoreSupplier = async (supplierId: string) => {
    setSaving(true);
    try {
      const result = await restoreSupplierAction(organizationId, supplierId);

      if (!result.success) {
        toast.error(result.error || "Failed to restore supplier");
        return;
      }

      toast.success("Supplier restored successfully");
      await fetchSuppliers();
    } catch (error) {
      console.error("[useSupplierForm] handleRestoreSupplier:", error);
      toast.error("Failed to restore supplier");
    } finally {
      setSaving(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────────

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
    enrichedSupplier,
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
