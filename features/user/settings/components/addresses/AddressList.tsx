"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { AddressCard } from "@/features/user/settings/components/addresses/AddressCard";
import { AddressFormDialog } from "@/features/user/settings/components/addresses/AddressFormDialog";
import { EmptyAddresses } from "@/features/user/settings/components/addresses/EmptyAddresses";
import {
  deleteAddress,
  setDefaultAddress,
} from "@/features/user/settings/actions/addressActions";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface AddressListProps {
  addresses: UserAddress[];
}

export function AddressList({ addresses: initialAddresses }: AddressListProps) {
  const router = useRouter();

  const [addresses, setAddresses] = useState(initialAddresses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<
    UserAddress | undefined
  >();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync with server data on re-render
  useState(() => {
    setAddresses(initialAddresses);
  });

  const openCreateDialog = useCallback(() => {
    setEditingAddress(undefined);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((address: UserAddress) => {
    setEditingAddress(address);
    setDialogOpen(true);
  }, []);

  async function handleDelete(addressId: string) {
    // Optimistic removal
    const previous = addresses;
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));

    const result = await deleteAddress(addressId);
    if (result.success) {
      setSuccessMsg("Address deleted.");
      router.refresh();
    } else {
      setAddresses(previous);
      setErrorMsg(result.error);
    }
  }

  async function handleSetDefault(addressId: string) {
    // Optimistic update
    const previous = addresses;
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        is_default: a.id === addressId,
      })),
    );

    const result = await setDefaultAddress(addressId);
    if (result.success) {
      setSuccessMsg("Default address updated.");
      router.refresh();
    } else {
      setAddresses(previous);
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SettingsPageHeader
          title="Addresses"
          description="Manage your delivery addresses."
        />
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="shrink-0 mt-1"
          disabled
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Address
        </Button>
      </div>

      {successMsg && (
        <SettingsSuccessAlert
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}
      {errorMsg && (
        <SettingsErrorAlert
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      <div className="relative">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Coming Soon!</h3>
            <p className="text-muted-foreground">
              This feature is under construction and will be available soon.
            </p>
          </div>
        </div>
        <div className="min-h-[200px] blur-sm">
          {addresses.length === 0 ? (
            <EmptyAddresses onAdd={openCreateDialog} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={() => openEditDialog(address)}
                  onDelete={() => handleDelete(address.id)}
                  onSetDefault={() => handleSetDefault(address.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddressFormDialog
        address={editingAddress}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
