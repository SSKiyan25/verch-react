"use client";

import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductFormHeaderProps {
  isEditing: boolean;
  productName?: string;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductFormHeader({
  isEditing,
  productName,
  isSaving,
  onSave,
  onCancel,
}: ProductFormHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Go back</span>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {isEditing ? "Edit Product" : "Create Product"}
            </h1>
            {isEditing && productName && (
              <p className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none">
                {productName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="hidden sm:flex"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
