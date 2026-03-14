"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AddressForm } from "@/features/user/settings/components/addresses/AddressForm";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface AddressFormDialogProps {
  address?: UserAddress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddressFormDialog({
  address,
  open,
  onOpenChange,
}: AddressFormDialogProps) {
  const isEditMode = !!address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Address" : "Add Address"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your delivery address details."
              : "Add a new delivery address."}
          </DialogDescription>
        </DialogHeader>
        <AddressForm address={address} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
