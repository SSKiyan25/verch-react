"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useDuplicatePromotion } from "../hooks/useDuplicatePromotion";

type DuplicatePromotionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  promotionId: string;
  currentName: string;
};

export function DuplicatePromotionDialog({
  open,
  onOpenChange,
  orgId,
  promotionId,
  currentName,
}: DuplicatePromotionDialogProps) {
  const [newName, setNewName] = useState(`${currentName} (Copy)`);
  const { duplicate, isPending } = useDuplicatePromotion({
    orgId,
    onSuccess: () => onOpenChange(false),
  });

  const handleDuplicate = async () => {
    await duplicate(promotionId, newName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Promotion</DialogTitle>
          <DialogDescription>
            Create a copy of this promotion as a new draft. You can edit it
            before activating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new_name">New Promotion Name</Label>
            <Input
              id="new_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter a name for the duplicated promotion"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isPending || !newName}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
