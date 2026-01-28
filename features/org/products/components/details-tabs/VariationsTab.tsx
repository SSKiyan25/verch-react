"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  Package,
  Tag,
  MoreVertical,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductWithDetails, ProductVariation } from "@/lib/types/product";
import { getVariationDisplayName } from "@/lib/utils/product-utils";
import { useVariationModal } from "../../hooks/useVariationModal";
import { VariationModal } from "../modals/VariationModal";
import { ArchiveVariationDialog } from "./ArchiveVariationDialog";

interface VariationsTabProps {
  product: ProductWithDetails;
  onProductUpdate?: (product: ProductWithDetails) => void;
}

export function VariationsTab({
  product,
  onProductUpdate,
}: VariationsTabProps) {
  const [localVariations, setLocalVariations] = useState<ProductVariation[]>(
    product.variations || []
  );
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [variationToArchive, setVariationToArchive] =
    useState<ProductVariation | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const {
    isOpen,
    isLoading,
    editingVariation,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    handleRestore,
  } = useVariationModal({
    productId: product.id,
    organizationId: product.organization_id,
    onVariationCreate: (newVariation) => {
      setLocalVariations((prev) => [...prev, newVariation]);
      onProductUpdate?.({
        ...product,
        variations: [...localVariations, newVariation],
      });
    },
    onVariationUpdate: (updatedVariation) => {
      setLocalVariations((prev) =>
        prev.map((v) => (v.id === updatedVariation.id ? updatedVariation : v))
      );
      onProductUpdate?.({
        ...product,
        variations: localVariations.map((v) =>
          v.id === updatedVariation.id ? updatedVariation : v
        ),
      });
    },
    onVariationDelete: (variationId) => {
      setLocalVariations((prev) =>
        prev.map((v) =>
          v.id === variationId ? { ...v, is_archived: true } : v
        )
      );
      onProductUpdate?.({
        ...product,
        variations: localVariations.map((v) =>
          v.id === variationId ? { ...v, is_archived: true } : v
        ),
      });
    },
  });

  const openArchiveDialog = (variation: ProductVariation) => {
    setVariationToArchive(variation);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = () => {
    if (variationToArchive) {
      handleDelete(variationToArchive.id);
      setVariationToArchive(null);
    }
  };

  // Handle restore functionality
  const handleRestoreVariation = (variation: ProductVariation) => {
    handleRestore(variation.id);
  };

  // Filter variations based on archived status
  const filteredVariations = localVariations.filter((variation) => {
    if (showArchived) {
      return variation.is_archived; // Show only archived
    }
    return !variation.is_archived; // Show only active (non-archived)
  });

  // Count variations for display
  const activeCount = localVariations.filter((v) => !v.is_archived).length;
  const archivedCount = localVariations.filter((v) => v.is_archived).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Product Variations</h3>
          <p className="text-sm text-muted-foreground">
            Manage different options and stock levels
          </p>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto"
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Variation
        </Button>
      </div>

      {/* Archive Toggle Section */}
      {(activeCount > 0 || archivedCount > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="show-archived" className="text-sm font-medium">
                {showArchived
                  ? "Show Active Variations"
                  : "Show Archived Variations"}
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>Active: {activeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Archive className="w-4 h-4" />
              <span>Archived: {archivedCount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredVariations.length > 0 ? (
          filteredVariations.map((variation) => (
            <Card
              key={variation.id}
              className={`border-l-4 ${
                variation.is_archived
                  ? "border-l-muted-foreground/30 bg-muted/20"
                  : "border-l-primary/20"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <CardTitle
                        className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                          variation.is_archived
                            ? "text-muted-foreground"
                            : "text-primary"
                        }`}
                      >
                        <Tag className="w-4 h-4" />
                        {getVariationDisplayName(variation)}
                      </CardTitle>
                      {variation.sku && (
                        <Badge variant="secondary" className="text-xs w-fit">
                          SKU: {variation.sku}
                        </Badge>
                      )}
                      {!variation.is_available && (
                        <Badge variant="destructive" className="text-xs w-fit">
                          Unavailable
                        </Badge>
                      )}
                      {variation.is_archived && (
                        <Badge variant="outline" className="text-xs w-fit">
                          Archived
                        </Badge>
                      )}
                    </div>
                    {variation.attributes &&
                      Object.keys(variation.attributes).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variation.attributes).map(
                            ([key, value]) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="text-xs"
                              >
                                {key}: {String(value)}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => openEditModal(variation)}
                      disabled={isLoading || variation.is_archived}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {variation.is_archived ? "View" : "Edit"}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-auto px-3"
                          disabled={isLoading}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {variation.is_archived ? (
                          <DropdownMenuItem
                            onClick={() => handleRestoreVariation(variation)}
                            disabled={isLoading}
                          >
                            <EyeOff className="w-4 h-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => openArchiveDialog(variation)}
                            disabled={isLoading}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Price
                    </div>
                    <div className="font-bold text-lg text-green-600">
                      ₱{variation.price.toFixed(2)}
                    </div>
                    {variation.compare_at_price && (
                      <div className="text-xs text-muted-foreground line-through">
                        ₱{variation.compare_at_price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Available Stock
                    </div>
                    <div className="font-bold text-lg">
                      {variation.available_quantity}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Reserved
                    </div>
                    <div className="font-bold text-lg text-orange-600">
                      {variation.reserved_quantity}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Sold
                    </div>
                    <div className="font-bold text-lg text-blue-600">
                      {variation.completed_orders}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h4 className="font-medium mb-2">
                {showArchived
                  ? "No archived variations found"
                  : "No variations found"}
              </h4>
              <p className="text-sm mb-4">
                {showArchived
                  ? "There are no archived variations for this product."
                  : "Add variations to manage different options like size, color, material, etc."}
              </p>
              {!showArchived && (
                <Button variant="outline" size="sm" onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Variation
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Variation Modal */}
      <VariationModal
        open={isOpen}
        onOpenChange={closeModal}
        product={product}
        variation={editingVariation}
        onSave={handleSave}
        isLoading={isLoading}
      />

      {/* Archive Confirmation Dialog */}
      <ArchiveVariationDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        variation={variationToArchive}
        onConfirm={handleArchiveConfirm}
        isLoading={isLoading}
      />
    </div>
  );
}
