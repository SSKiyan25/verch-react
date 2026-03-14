"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Star, Pencil, Trash2 } from "lucide-react";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface AddressCardProps {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

const labelColors: Record<UserAddress["label"], string> = {
  home: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  school:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  office:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const fullAddress = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${labelColors[address.label]}`}
        >
          {address.label}
        </span>
        {address.is_default && (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          >
            <Star className="mr-1 h-3 w-3" />
            Default
          </Badge>
        )}
      </div>

      <div>
        <p className="font-medium">{address.recipient_name}</p>
        <p className="text-sm text-muted-foreground">
          {address.contact_number}
        </p>
      </div>

      <p className="text-sm">{fullAddress}</p>

      {address.notes && (
        <p className="text-sm text-muted-foreground italic">{address.notes}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        {!address.is_default && (
          <Button variant="ghost" size="sm" onClick={onSetDefault} disabled>
            Set as Default
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit} disabled>
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the &quot;{address.label}&quot;
                address for {address.recipient_name}. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  setIsDeleting(true);
                  onDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
