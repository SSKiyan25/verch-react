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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const POSITION_OPTIONS = [
  { value: "Member", label: "Member", disabled: false },
  { value: "Officer", label: "Officer (Coming soon)", disabled: true },
  {
    value: "Vice President",
    label: "Vice President (Coming soon)",
    disabled: true,
  },
  { value: "President", label: "President (Coming soon)", disabled: true },
  { value: "Secretary", label: "Secretary (Coming soon)", disabled: true },
  { value: "Treasurer", label: "Treasurer (Coming soon)", disabled: true },
];

type ApproveMembershipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: (position?: string) => void;
  isPending: boolean;
};

export function ApproveMembershipDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isPending,
}: ApproveMembershipDialogProps) {
  const [position, setPosition] = useState<string>("");

  const handleConfirm = () => {
    onConfirm(position || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isPending) {
      setPosition("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Membership</DialogTitle>
          <DialogDescription>
            You are about to approve the membership application for {memberName}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="position">Position (optional)</Label>
          <Select
            value={position}
            onValueChange={setPosition}
            disabled={isPending}
          >
            <SelectTrigger id="position">
              <SelectValue placeholder="Select position..." />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select a position to assign to this member (e.g., Member, Officer,
            President)
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Approve Membership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
