"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type SuspendUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (reason: string) => void;
  isPending: boolean;
};

export function SuspendUserDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
  isPending,
}: SuspendUserDialogProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.length >= 10;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(reason);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to suspend the account for <strong>{userName}</strong>
            . This will prevent them from logging in and accessing the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Suspension Reason *</Label>
          <Textarea
            id="reason"
            placeholder="Enter the reason for suspension (minimum 10 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {reason.length}/500 characters
            {!isValid && reason.length > 0 && " (minimum 10 required)"}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || !isValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Suspend User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
