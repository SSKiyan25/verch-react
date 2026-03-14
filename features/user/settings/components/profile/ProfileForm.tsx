"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { SettingsSaveButton } from "@/features/user/settings/components/shared/SettingsSaveButton";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { AvatarUpload } from "@/features/user/settings/components/profile/AvatarUpload";
import { updateUserProfile } from "@/features/user/settings/actions/profileActions";
import type { UserProfileData } from "@/lib/supabase/queries/user-settings";

interface ProfileFormProps {
  profile: UserProfileData | null;
  userId: string;
}

export function ProfileForm({ profile, userId }: ProfileFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [gender, setGender] = useState(profile?.gender ?? "");
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? "");
  const [defaultFulfillment, setDefaultFulfillment] = useState<
    "pickup" | "delivery"
  >(profile?.default_fulfillment ?? "pickup");

  // const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
  //   profile?.avatar_url ?? undefined,
  // );
  // const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Name must be at least 2 characters";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const result = await updateUserProfile({
      full_name: fullName.trim(),
      bio: bio.trim() || undefined,
      gender: gender || undefined,
      birthdate: birthdate || undefined,
      default_fulfillment: defaultFulfillment,
    });

    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Profile updated successfully.");
      router.refresh();
    } else {
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Profile"
        description="Manage your personal information and preferences."
      />

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

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        {/* Avatar */}
        <div className="space-y-2">
          <Label>Profile Photo</Label>
          <AvatarUpload
            currentUrl={profile?.avatar_url ?? null}
            fullName={fullName}
            userId={userId}
            // onChange={(url, path) => {
            //   setAvatarUrl(url);
            //   setAvatarPath(path);
            // }}
          />
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
          {fieldErrors.fullName && (
            <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tell us a little about yourself"
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length} / 500
          </p>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">
                Prefer not to say
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Birthdate */}
        <div className="space-y-2">
          <Label htmlFor="birthdate">Birthdate</Label>
          <Input
            id="birthdate"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>

        {/* Default Fulfillment */}
        <div className="space-y-2">
          <Label>Default Fulfillment</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={defaultFulfillment === "pickup" ? "default" : "outline"}
              size="sm"
              onClick={() => setDefaultFulfillment("pickup")}
            >
              Pickup
            </Button>
            <Button
              type="button"
              variant={
                defaultFulfillment === "delivery" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setDefaultFulfillment("delivery")}
            >
              Delivery
            </Button>
          </div>
        </div>

        <SettingsSaveButton isLoading={isLoading} />
      </form>
    </div>
  );
}
