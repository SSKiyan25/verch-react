/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEditProduct } from "../../hooks/useEditProduct";
import { useProductCategories } from "../../hooks/useProductCategories";
import { toast } from "sonner";

interface EditProductModalProps {
  product: ProductWithDetails;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedProduct: ProductWithDetails) => void;
}

export function EditProductModal({
  product,
  orgId,
  open,
  onOpenChange,
  onSave,
}: EditProductModalProps) {
  const { categories, isLoading: categoriesLoading } = useProductCategories();

  // Initialize form state - will be reset when modal opens via useEffect
  const [formData, setFormData] = useState({
    name: product.name || "",
    description: product.description || "",
    search_keywords: product.search_keywords?.join(", ") || "",
    category_id: product.category_id || "",
  });

  // Reset form data when modal opens or product changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        search_keywords: product.search_keywords?.join(", ") || "",
        category_id: product.category_id || "",
      });
    }
    // We intentionally only depend on 'open' and product.id to avoid
    // excessive resets. Full product fields are read when modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product.id]);

  const { updateProduct, isLoading, globalError, fieldErrors, clearErrors } =
    useEditProduct({
      onSuccess: (updatedProduct) => {
        toast.success("Product updated successfully");
        // Call parent's save handler with fresh data
        // Parent will handle refetch and modal closure
        onSave?.(updatedProduct);
        // Don't close modal immediately - let parent control this after refetch
      },
      onError: (error) => {
        toast.error(error.message);
        console.error("[EditProductModal] Update failed:", error);
      },
    });

  const handleSave = async () => {
    // Clear any previous errors
    clearErrors();

    try {
      // Process search keywords
      const searchKeywords = formData.search_keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      const updateData = {
        name: formData.name,
        description: formData.description,
        search_keywords: searchKeywords,
        category_id:
          formData.category_id === "none" ? null : formData.category_id || null,
      };

      await updateProduct(orgId, product.id, updateData);
    } catch (error) {
      // Error handling is done in the hook
      console.error("[EditProductModal] Save failed:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get display errors (either from hook or local state)
  const getFieldError = (field: string) => {
    return fieldErrors[field] || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Product Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Information Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This form edits basic product information and category. For
              status, permissions, photos, variations, discounts, and supplier
              settings, use the respective tabs.
            </AlertDescription>
          </Alert>

          {/* Global Error */}
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter product name"
              className={getFieldError("name") ? "border-red-500" : ""}
            />
            {getFieldError("name") && (
              <p className="text-sm text-red-500">{getFieldError("name")}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter product description"
              rows={4}
              className={getFieldError("description") ? "border-red-500" : ""}
            />
            {getFieldError("description") && (
              <p className="text-sm text-red-500">
                {getFieldError("description")}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id || "none"}
              onValueChange={(value) =>
                handleInputChange("category_id", value === "none" ? "" : value)
              }
              disabled={categoriesLoading}
            >
              <SelectTrigger
                className={getFieldError("category_id") ? "border-red-500" : ""}
              >
                <SelectValue
                  placeholder={
                    categoriesLoading
                      ? "Loading categories..."
                      : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError("category_id") && (
              <p className="text-sm text-red-500">
                {getFieldError("category_id")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Categories help organize your products and improve discoverability
            </p>
          </div>

          {/* Search Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Search Keywords</Label>
            <Input
              id="keywords"
              value={formData.search_keywords}
              onChange={(e) =>
                handleInputChange("search_keywords", e.target.value)
              }
              placeholder="keyword1, keyword2, keyword3"
              className={
                getFieldError("search_keywords") ? "border-red-500" : ""
              }
            />
            {getFieldError("search_keywords") && (
              <p className="text-sm text-red-500">
                {getFieldError("search_keywords")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Separate keywords with commas. These help customers find your
              product.
            </p>
          </div>

          {/* Settings Reference */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Additional Settings
            </h4>
            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <p>
                • <strong>Status & Permissions:</strong> Configure in the
                "Settings" tab
              </p>
              <p>
                • <strong>Photos:</strong> Manage in the "Photos" tab
              </p>
              <p>
                • <strong>Variations & Pricing:</strong> Set up in the
                "Variations" tab
              </p>
              <p>
                • <strong>Supplier:</strong> Assign in the "Supplier" tab
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
