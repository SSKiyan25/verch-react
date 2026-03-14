"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSaveButton } from "@/features/user/settings/components/shared/SettingsSaveButton";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import {
  createAddress,
  updateAddress,
} from "@/features/user/settings/actions/addressActions";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface AddressFormProps {
  address?: UserAddress;
  onSuccess: () => void;
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const router = useRouter();
  const isEditMode = !!address;

  const [label, setLabel] = useState<UserAddress["label"]>(
    address?.label ?? "home",
  );
  const [recipientName, setRecipientName] = useState(
    address?.recipient_name ?? "",
  );
  const [contactNumber, setContactNumber] = useState(
    address?.contact_number ?? "",
  );
  const [street, setStreet] = useState(address?.street ?? "");
  const [barangay, setBarangay] = useState(address?.barangay ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [province, setProvince] = useState(address?.province ?? "");
  const [postalCode, setPostalCode] = useState(address?.postal_code ?? "");
  const [notes, setNotes] = useState(address?.notes ?? "");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (recipientName.trim().length < 2)
      errors.recipientName = "Recipient name is required";
    if (contactNumber.trim().length < 7)
      errors.contactNumber = "Valid contact number is required";
    if (street.trim().length < 2) errors.street = "Street is required";
    if (city.trim().length < 2) errors.city = "City is required";
    if (province.trim().length < 2) errors.province = "Province is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrorMsg(null);

    const input = {
      label,
      recipient_name: recipientName.trim(),
      contact_number: contactNumber.trim(),
      street: street.trim(),
      barangay: barangay.trim() || undefined,
      city: city.trim(),
      province: province.trim(),
      postal_code: postalCode.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const result = isEditMode
      ? await updateAddress(address.id, input)
      : await createAddress(input);

    setIsLoading(false);

    if (result.success) {
      router.refresh();
      onSuccess();
    } else {
      setErrorMsg(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <SettingsErrorAlert
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Select
          value={label}
          onValueChange={(v) => setLabel(v as UserAddress["label"])}
        >
          <SelectTrigger id="label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home">Home</SelectItem>
            <SelectItem value="school">School</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipientName">Recipient Name</Label>
        <Input
          id="recipientName"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          required
        />
        {fieldErrors.recipientName && (
          <p className="text-sm text-destructive">
            {fieldErrors.recipientName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressContactNumber">Contact Number</Label>
        <Input
          id="addressContactNumber"
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          required
        />
        {fieldErrors.contactNumber && (
          <p className="text-sm text-destructive">
            {fieldErrors.contactNumber}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">Street</Label>
        <Input
          id="street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          required
        />
        {fieldErrors.street && (
          <p className="text-sm text-destructive">{fieldErrors.street}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="barangay">Barangay</Label>
        <Input
          id="barangay"
          value={barangay}
          onChange={(e) => setBarangay(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          {fieldErrors.city && (
            <p className="text-sm text-destructive">{fieldErrors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            required
          />
          {fieldErrors.province && (
            <p className="text-sm text-destructive">{fieldErrors.province}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input
          id="postalCode"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Delivery Instructions</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for the courier"
          rows={3}
        />
      </div>

      <SettingsSaveButton
        isLoading={isLoading}
        label={isEditMode ? "Update Address" : "Add Address"}
      />
    </form>
  );
}
