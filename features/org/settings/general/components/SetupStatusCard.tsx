"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  MapPin,
  Image,
  Info,
} from "lucide-react";
import { Organization } from "@/lib/types/organization";

interface SetupStatusCardProps {
  organization: Organization;
  setupProgress: number;
  setupChecks: {
    basicInfo: boolean;
    businessHours: boolean;
    commission: boolean;
    address: boolean;
    images: boolean;
  };
}

export function SetupStatusCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  organization,
  setupProgress,
  setupChecks,
}: SetupStatusCardProps) {
  const setupItems = [
    {
      key: "basicInfo",
      label: "Basic Information",
      description: "Organization name, email, and description",
      icon: Building2,
      completed: setupChecks.basicInfo,
      isProfile: true,
    },
    {
      key: "address",
      label: "Business Address",
      description: "Complete address for customer location",
      icon: MapPin,
      completed: setupChecks.address,
      isProfile: true,
    },
    {
      key: "images",
      label: "Logo & Cover Images",
      description: "Visual identity for your organization",
      icon: Image,
      completed: setupChecks.images,
      isProfile: true,
    },
    {
      key: "businessHours",
      label: "Business Hours",
      description: "Operating schedule for customers",
      icon: Clock,
      completed: setupChecks.businessHours,
      isProfile: false,
    },
  ];

  const isSetupComplete = setupProgress === 100;

  return (
    <Card
      className={`${
        isSetupComplete
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      }`}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {isSetupComplete ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <CardTitle className="text-lg">
                {isSetupComplete ? "Setup Complete" : "Setup Required"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isSetupComplete
                  ? "Your organization is ready to go public"
                  : "Complete setup to make your organization publicly visible"}
              </p>
            </div>
          </div>
          <Badge
            variant={isSetupComplete ? "default" : "secondary"}
            className="w-fit"
          >
            {setupProgress}% Complete
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Setup Progress</span>
            <span className="font-medium">{setupProgress}%</span>
          </div>
          <Progress value={setupProgress} className="h-2" />
        </div>
      </CardHeader>

      {!isSetupComplete && (
        <CardContent className="space-y-4">
          <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Your organization is currently hidden from public view. Complete
                the following items to activate public visibility.
              </p>
            </div>

            <div className="grid gap-3">
              {setupItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="relative flex flex-col gap-2 p-2 rounded-md border bg-background min-h-[120px] sm:flex-row sm:items-center sm:gap-3 sm:p-3 sm:min-h-0"
                  >
                    {/* Icon */}
                    <div className="flex justify-center sm:justify-start">
                      <div
                        className={`p-1.5 rounded ${
                          item.completed
                            ? "bg-green-100 dark:bg-green-900/20"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 sm:w-4 sm:h-4 ${
                            item.completed ? "text-green-600" : "text-gray-400"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 text-center sm:text-left pb-10 sm:pb-0">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <h4 className="text-sm font-medium">{item.label}</h4>
                        {item.completed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>

                    {/* Button/Badge */}
                    <div className="absolute bottom-2 right-2 sm:relative sm:bottom-auto sm:right-auto sm:self-center">
                      {item.completed ? (
                        <Badge variant="secondary" className="text-xs">
                          Complete
                        </Badge>
                      ) : item.isProfile ? (
                        <Link href="/org/settings/profile">
                          <Button variant="ghost" size="sm" className="text-xs">
                            Setup <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
