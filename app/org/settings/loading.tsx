"use client";

import { Loader2, Settings, Shield, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-4 w-96 bg-muted animate-pulse rounded-lg"></div>
      </div>

      {/* Interactive Loading Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: General Settings */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500">
            <div className="h-full bg-blue-600 animate-progress"></div>
          </div>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin-slow" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Security */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500">
            <div className="h-full bg-green-600 animate-progress animation-delay-200"></div>
          </div>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Notifications */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500">
            <div className="h-full bg-amber-600 animate-progress animation-delay-400"></div>
          </div>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce-slow" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Loading your settings</p>
              <p className="text-sm text-muted-foreground">
                Just a moment while we fetch your organization data...
              </p>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce animation-delay-400"></div>
          </div>
        </CardContent>
      </Card>

      {/* Form Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-10 w-full bg-muted animate-pulse rounded-lg"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-10 w-full bg-muted animate-pulse rounded-lg"></div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
