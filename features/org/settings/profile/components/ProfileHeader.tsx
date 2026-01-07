"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";

interface ProfileHeaderProps {
  organizationName: string;
  setupProgress: number;
  isSetupComplete: boolean;
}

export function ProfileHeader({
  organizationName,
  setupProgress,
  isSetupComplete,
}: ProfileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push("/org/settings");
  };

  return (
    <Card
      className={`${
        isSetupComplete
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      }`}
    >
      <CardHeader className="space-y-4">
        {/* Back Button */}
        <div className="flex items-center justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to General Settings
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isSetupComplete ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div className="text-left">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {organizationName || "Organization Profile"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete your profile information to go public
              </p>
            </div>
          </div>
          <Badge
            variant={isSetupComplete ? "default" : "secondary"}
            className="text-xs hidden sm:block w-fit"
          >
            {setupProgress}% Complete
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Profile Completion</span>
            <span className="font-medium">{setupProgress}%</span>
          </div>
          <Progress value={setupProgress} className="h-2" />
        </div>
      </CardHeader>
    </Card>
  );
}
