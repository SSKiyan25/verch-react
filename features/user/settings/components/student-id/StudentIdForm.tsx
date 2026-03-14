"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SettingsSaveButton } from "@/features/user/settings/components/shared/SettingsSaveButton";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { upsertStudentInfo } from "@/features/user/settings/actions/studentActions";
import type { StudentInfo } from "@/lib/supabase/queries/user-settings";

interface StudentIdFormProps {
  studentInfo: StudentInfo | null;
  userId: string;
}

export function StudentIdForm({ studentInfo, userId }: StudentIdFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [idNumber, setIdNumber] = useState(studentInfo?.id_number ?? "");
  const [firstName, setFirstName] = useState(studentInfo?.first_name ?? "");
  const [lastName, setLastName] = useState(studentInfo?.last_name ?? "");
  const [college, setCollege] = useState(studentInfo?.college ?? "");
  const [department, setDepartment] = useState(studentInfo?.department ?? "");
  const [course, setCourse] = useState(studentInfo?.course ?? "");
  const [yearLevel, setYearLevel] = useState<string>(
    studentInfo?.year_level?.toString() ?? "",
  );
  const [schoolEmail, setSchoolEmail] = useState(
    studentInfo?.school_email ?? "",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(
    !!studentInfo?.id_photo_path,
  );

  const [photoPath, setPhotoPath] = useState<string | null>(
    studentInfo?.id_photo_path ?? null,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Generate signed URL on mount if a photo path exists
  useEffect(() => {
    if (!studentInfo?.id_photo_path) {
      setIsLoadingPhoto(false);
      return;
    }

    const supabase = createClient();
    supabase.storage
      .from("student-ids")
      .createSignedUrl(studentInfo.id_photo_path, 3600)
      .then(({ data, error }) => {
        // console.log("[StudentIdForm] signedUrl data:", data, "error:", error);
        if (!error && data) {
          setPhotoUrl(data.signedUrl);
        }
      })
      .finally(() => setIsLoadingPhoto(false));
  }, [studentInfo?.id_photo_path]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File must be less than 2MB");
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/student-id.${ext}`;

    setIsUploading(true);
    try {
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("student-ids")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setUploadError(uploadError.message);
        return;
      }

      // Private bucket — signed URL for preview only, expires in 1 hour
      const { data: signedData, error: signedError } = await supabase.storage
        .from("student-ids")
        .createSignedUrl(path, 3600);

      if (signedError || !signedData) {
        setUploadError("Uploaded but failed to generate preview");
        return;
      }

      setPhotoUrl(signedData.signedUrl); // preview only — NOT saved to DB
      setPhotoPath(path); // this gets saved on form submit
    } catch {
      setUploadError("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!idNumber.trim()) errors.idNumber = "ID number is required";
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const result = await upsertStudentInfo({
      id_number: idNumber.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      college: college.trim() || undefined,
      department: department.trim() || undefined,
      course: course.trim() || undefined,
      year_level: yearLevel ? parseInt(yearLevel, 10) : undefined,
      school_email: schoolEmail.trim() || undefined,
      id_photo_url: photoPath ?? undefined, // store the path, not the signed URL
      id_photo_path: photoPath ?? undefined,
    });

    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Student ID submitted for verification.");
      router.refresh();
    } else {
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          Your student ID will be reviewed by the platform admin within 1–5
          business days.
        </AlertDescription>
      </Alert>

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

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number</Label>
          <Input
            id="idNumber"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
          />
          {fieldErrors.idNumber && (
            <p className="text-sm text-destructive">{fieldErrors.idNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            {fieldErrors.firstName && (
              <p className="text-sm text-destructive">
                {fieldErrors.firstName}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            {fieldErrors.lastName && (
              <p className="text-sm text-destructive">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="college">Faculty</Label>
          <Input
            id="college"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Input
            id="course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearLevel">Year Level</Label>
          <Select value={yearLevel} onValueChange={setYearLevel}>
            <SelectTrigger id="yearLevel">
              <SelectValue placeholder="Select year level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
              <SelectItem value="5">5th Year</SelectItem>
              <SelectItem value="6">6th Year or above</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schoolEmail">School Email</Label>
          <Input
            id="schoolEmail"
            type="email"
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {/* Photo Upload */}
        <div className="space-y-2">
          <Label>Student ID Photo</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          {isLoadingPhoto ? (
            <div className="mt-2 flex h-32 w-48 items-center justify-center rounded-md border bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : photoUrl ? (
            <div className="relative mt-2 h-32 w-48 overflow-hidden rounded-md border">
              <Image
                src={photoUrl}
                alt="Student ID preview"
                fill
                className="object-cover"
                sizes="192px"
                loading="eager"
              />
            </div>
          ) : null}
        </div>

        <SettingsSaveButton
          isLoading={isLoading}
          label="Submit for Verification"
        />
      </form>
    </div>
  );
}
