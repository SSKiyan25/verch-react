"use client";

import { useState } from "react";
import { Supplier } from "@/lib/types/supplier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Archive, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SupplierSelectorProps {
  suppliers: Supplier[];
  archivedSuppliers: Supplier[];
  selectedSupplierId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onSelectChange: (supplierId: string) => void;
  onLink: () => void;
  onRestore: (supplierId: string) => void;
}

export function SupplierSelector({
  suppliers,
  archivedSuppliers,
  selectedSupplierId,
  isLoading,
  isSaving,
  onSelectChange,
  onLink,
  onRestore,
}: SupplierSelectorProps) {
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);
  const [selectedArchivedId, setSelectedArchivedId] = useState<string>("");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Existing Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Choose from your suppliers</Label>
            <Select
              value={selectedSupplierId || ""}
              onValueChange={onSelectChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onLink}
            disabled={!selectedSupplierId || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Link Selected Supplier
              </>
            )}
          </Button>

          {/* Show Archived Button */}
          {archivedSuppliers.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowArchivedDialog(true)}
              className="w-full"
            >
              <Archive className="w-4 h-4 mr-2" />
              View Archived Suppliers ({archivedSuppliers.length})
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or create new
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Archived Suppliers Dialog */}
      <AlertDialog
        open={showArchivedDialog}
        onOpenChange={setShowArchivedDialog}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archived Suppliers</AlertDialogTitle>
            <AlertDialogDescription>
              Select a supplier to restore it. This will make it available for
              linking to products again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select
              value={selectedArchivedId}
              onValueChange={setSelectedArchivedId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select archived supplier..." />
              </SelectTrigger>
              <SelectContent>
                {archivedSuppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    <div className="flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{supplier.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedArchivedId("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedArchivedId) {
                  onRestore(selectedArchivedId);
                  setShowArchivedDialog(false);
                  setSelectedArchivedId("");
                }
              }}
              disabled={!selectedArchivedId || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Supplier
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
