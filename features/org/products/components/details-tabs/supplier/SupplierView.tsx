"use client";

import { useState } from "react";
import { Supplier } from "@/lib/types/supplier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Building,
  Edit,
  Phone,
  Mail,
  MapPin,
  Loader2,
  X,
  Link as LinkIcon,
  ExternalLink,
  Archive,
} from "lucide-react";
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

interface SupplierViewProps {
  supplier: Supplier;
  onEdit: () => void;
  onRemove: () => void;
  onArchive: () => void;
  isRemoving: boolean;
  isArchiving: boolean;
}

export function SupplierView({
  supplier,
  onEdit,
  onRemove,
  onArchive,
  isRemoving,
  isArchiving,
}: SupplierViewProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleLoading = isRemoving || isArchiving;
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 min-w-0 flex-1">
              <Building className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-lg sm:text-xl">
                {supplier.name}
              </span>
            </CardTitle>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-shrink-0"
              >
                <Edit className="w-4 h-4 sm:mr-2" />
                <span className="sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                disabled={handleLoading}
                className="text-orange-600 hover:text-orange-700 flex-shrink-0"
              >
                {handleLoading ? (
                  <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 sm:mr-2" />
                )}
                <span className="sm:inline">Unlink</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveDialog(true)}
                disabled={handleLoading}
                className="text-red-600 hover:text-red-700 flex-shrink-0"
              >
                {handleLoading ? (
                  <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4 sm:mr-2" />
                )}
                <span className="sm:inline">Archive</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplier.description && (
            <p className="text-sm text-muted-foreground">
              {supplier.description}
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {supplier.contact_number && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.contact_number}</span>
                </div>
              )}
              {supplier.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.contact_email}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {supplier.address.street && (
                      <div>{supplier.address.street}</div>
                    )}
                    {supplier.address.city && (
                      <div>
                        {supplier.address.city}
                        {supplier.address.state &&
                          `, ${supplier.address.state}`}
                      </div>
                    )}
                    {supplier.address.postal_code && (
                      <div>{supplier.address.postal_code}</div>
                    )}
                    {supplier.address.country && (
                      <div>{supplier.address.country}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Links Section */}
          {supplier.links && supplier.links.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-base font-medium">Links</Label>
                <div className="space-y-2">
                  {supplier.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">{link.type}</span>
                      {link.label && (
                        <span className="text-muted-foreground">
                          - {link.label}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Remove Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{supplier.name}</strong> from this
              product. The supplier data will remain in your system and can be
              linked to other products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRemoveDialog(false);
                onRemove();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Unlink Supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{supplier.name}</strong> and
              automatically unlink it from this product. Archived suppliers can
              be restored later if you decide to use them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowArchiveDialog(false);
                onArchive();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Archive Supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
