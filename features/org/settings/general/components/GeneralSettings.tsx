/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, ArrowRight, User } from "lucide-react";
import { BusinessHoursSection } from "./BusinessHoursSection";
import { OrderSettingsSection } from "./OrderSettingsSection";
import { PublicVisibilitySection } from "./PublicVisibilitySection";
import { SetupStatusCard } from "./SetupStatusCard";
import { Organization } from "@/lib/types/organization";

interface GeneralSettingsProps {
  organization: Organization;
  onUpdate: (data: Partial<Organization>) => Promise<any>;
  isLoading?: boolean;
  setupChecks: {
    basicInfo: boolean;
    businessHours: boolean;
    commission: boolean;
    address: boolean;
    images: boolean;
  };
  setupProgress: number;
}

export function GeneralSettings({
  organization,
  onUpdate,
  isLoading = false,
  setupChecks,
  setupProgress,
}: GeneralSettingsProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              General Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure your organization&apos;s core settings
            </p>
          </div>
        </div>

        {/* Profile Settings Navigation */}
        <Link href="/org/settings/profile">
          <Button variant="outline" className="w-full sm:w-auto">
            <User className="w-4 h-4 mr-2" />
            Profile Settings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Setup Status Card */}
      <SetupStatusCard
        organization={organization}
        setupProgress={setupProgress}
        setupChecks={setupChecks}
      />

      {/* Public Visibility Status */}
      <PublicVisibilitySection
        organization={organization}
        onUpdate={onUpdate}
        isSetupComplete={setupProgress === 100}
        isLoading={isLoading}
      />

      <Separator />

      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* Business Hours */}
        <BusinessHoursSection
          businessHours={organization.settings.businessHours}
          onUpdate={(businessHours) =>
            onUpdate({
              settings: { ...organization.settings, businessHours },
            })
          }
          isLoading={isLoading}
          isExpanded={activeSection === "business-hours"}
          onToggle={() =>
            setActiveSection(
              activeSection === "business-hours" ? null : "business-hours"
            )
          }
        />

        {/* Order Settings */}
        <OrderSettingsSection
          autoAcceptOrders={organization.settings.autoAcceptOrders}
          requireOrderApproval={organization.settings.requireOrderApproval}
          onUpdate={(orderSettings) =>
            onUpdate({
              settings: { ...organization.settings, ...orderSettings },
            })
          }
          isLoading={isLoading}
          isExpanded={activeSection === "orders"}
          onToggle={() =>
            setActiveSection(activeSection === "orders" ? null : "orders")
          }
        />
      </div>
    </div>
  );
}
