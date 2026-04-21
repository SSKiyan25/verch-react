"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupplierForm } from "../../hooks/useSupplierForm";
import { SupplierView } from "./supplier/SupplierView";
import { SupplierForm } from "./supplier/SupplierForm";
import { SupplierSelector } from "./supplier/SupplierSelector";

interface SupplierTabProps {
  product: ProductWithDetails;
  organizationId: string;
  onProductUpdate?: (product: ProductWithDetails) => void;
}

export function SupplierTab({
  product,
  organizationId,
  onProductUpdate,
}: SupplierTabProps) {
  const currentSupplier = product.supplier;

  const {
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
  } = useSupplierForm({
    productId: product.id,
    organizationId,
    currentSupplier,
    onSupplierUpdate: (updatedSupplier) => {
      // Update the product with new supplier data
      onProductUpdate?.({
        ...product,
        supplier: updatedSupplier,
      });
    },
  });
  // console.log("SupplierTab render", {
  //   currentSupplier,
  //   isEditMode,
  //   selectedSupplierId,
  //   suppliers,
  //   archivedSuppliers,
  // });

  const hasSupplier = !!enrichedSupplier && !isEditMode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Supplier Information</h3>
          <p className="text-sm text-muted-foreground">
            Manage supplier details and procurement information
          </p>
        </div>
        {hasSupplier && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Supplier Assigned
          </Badge>
        )}
      </div>

      {hasSupplier ? (
        /* Existing Supplier View */
        <SupplierView
          supplier={enrichedSupplier}
          onEdit={() => setIsEditMode(true)}
          onRemove={handleRemoveSupplier}
          onArchive={handleArchiveSupplier}
          isRemoving={saving}
          isArchiving={archiving}
        />
      ) : (
        /* Add/Edit Supplier Form */
        <div className="space-y-4">
          {/* Select Existing Supplier */}
          {!isEditMode && suppliers.length > 0 && (
            <SupplierSelector
              suppliers={suppliers}
              archivedSuppliers={archivedSuppliers}
              selectedSupplierId={selectedSupplierId}
              isLoading={loadingSuppliers}
              isSaving={saving}
              onSelectChange={setSelectedSupplierId}
              onLink={() =>
                selectedSupplierId &&
                handleSelectExistingSupplier(selectedSupplierId)
              }
              onRestore={handleRestoreSupplier}
            />
          )}

          {/* Create/Edit Supplier Form */}
          <SupplierForm
            formData={formData}
            errors={errors}
            isEditMode={isEditMode}
            isSaving={saving}
            onInputChange={handleInputChange}
            onAddressChange={handleAddressChange}
            onAddLink={handleAddLink}
            onLinkChange={handleLinkChange}
            onRemoveLink={handleRemoveLink}
            onSave={handleSaveSupplier}
            onCancel={() => {
              setIsEditMode(false);
              resetForm();
            }}
          />
        </div>
      )}

      {/* Guidelines */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">
            Supplier Guidelines
          </h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• You can link existing suppliers or create new ones</li>
            <li>• Keep supplier contact information up to date</li>
            <li>• Suppliers can be reused across multiple products</li>
            <li>
              • <strong>Unlink</strong> removes supplier from this product only
            </li>
            <li>
              • <strong>Archive</strong> removes supplier from product and hides
              it from listings
            </li>
            <li>• Archived suppliers can be restored anytime</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
