"use client";

import { Separator } from "@/components/ui/separator";

interface SettingsPageHeaderProps {
  title: string;
  description: string;
}

export function SettingsPageHeader({
  title,
  description,
}: SettingsPageHeaderProps) {
  return (
    <div className="space-y-1.5 flex-grow">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Separator className="!mt-4" />
    </div>
  );
}
