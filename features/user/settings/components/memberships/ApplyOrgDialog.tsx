"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Search, Upload, Loader2 } from "lucide-react";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { applyToOrganization } from "@/features/user/settings/actions/studentActions";

interface OrgResult {
  id: string;
  name: string;
  logo_image_url: string | null;
  product_count: number;
}

interface ApplyOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function ApplyOrgDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: ApplyOrgDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OrgResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<OrgResult | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pendingProofFile, setPendingProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null); // local object URL for preview

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true); // user is typing, don't show "no results" yet

    const timer = setTimeout(async () => {
      setIsDebouncing(false);
      setIsSearching(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_public_stores", {
          p_search: search.trim(),
          p_page: 1,
          p_page_size: 10,
        });

        if (error) {
          console.error("[ApplyOrgDialog] search error:", error.message);
          setResults([]);
          return;
        }

        const rows = (data ?? []) as Array<{
          id: string;
          name: string;
          logo_image_url: string | null;
          product_count: number;
        }>;
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedOrg) return;

      setUploadError(null);

      if (file.size > 2 * 1024 * 1024) {
        setUploadError("File must be less than 2MB");
        return;
      }

      // Just store the file — upload happens on submit
      setPendingProofFile(file);
      setProofPreviewUrl(URL.createObjectURL(file)); // local preview, no upload needed
    },
    [selectedOrg],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Step 1: Submit application first (no proof yet)
    const result = await applyToOrganization({
      organization_id: selectedOrg.id,
      proof_url: undefined,
      proof_path: undefined,
      academic_year: academicYear.trim() || undefined,
    });

    if (!result.success) {
      setErrorMsg(result.error);
      setIsSubmitting(false);
      return;
    }

    // Step 2: Upload proof only if application succeeded
    if (pendingProofFile) {
      const ext = pendingProofFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${selectedOrg.id}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("membership-proofs")
        .upload(path, pendingProofFile, { upsert: true });

      if (uploadError) {
        // Application succeeded but proof upload failed
        // Don't block — user can re-apply or org admin can request proof separately
        console.error(
          "[ApplyOrgDialog] proof upload failed:",
          uploadError.message,
        );
      } else {
        // Step 3: Update the membership record with the proof path
        await applyToOrganization({
          organization_id: selectedOrg.id,
          proof_url: path,
          proof_path: path,
          academic_year: academicYear.trim() || undefined,
        });
      }
    }

    setIsSubmitting(false);
    onSuccess?.();
    onOpenChange(false);
    resetState();
    router.refresh();
  }

  function resetState() {
    setSearch("");
    setResults([]);
    setSelectedOrg(null);
    setAcademicYear("");
    setPendingProofFile(null);
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl); // clean up object URL
    setProofPreviewUrl(null);
    setUploadError(null);
    setErrorMsg(null);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to Organization</DialogTitle>
          <DialogDescription>
            Search for an organization and submit your membership application.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <SettingsErrorAlert
            message={errorMsg}
            onDismiss={() => setErrorMsg(null)}
          />
        )}

        {!selectedOrg ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations..."
                className="pl-9"
              />
            </div>

            {isSearching || isDebouncing ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => setSelectedOrg(org)}
                    className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                      {org.logo_image_url ? (
                        <Image
                          src={org.logo_image_url}
                          alt={org.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                          {org.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {org.product_count} product
                        {org.product_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : search.trim() ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No organizations found.
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected org display */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                {selectedOrg.logo_image_url ? (
                  <Image
                    src={selectedOrg.logo_image_url}
                    alt={selectedOrg.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                    {selectedOrg.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium">{selectedOrg.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelectedOrg(null)}
              >
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-2025 (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Proof of Membership</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting} // ← was isUploading
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {pendingProofFile ? "Change Proof" : "Upload Proof"}
                </Button>
                {pendingProofFile && (
                  <span className="text-xs text-muted-foreground">
                    File uploaded
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Image or PDF, max 2MB (optional)
              </p>
              <p className="text-xs text-muted-foreground">
                You may send any type of proof (e.g. screenshot, photo, PDF,
                etc).
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
