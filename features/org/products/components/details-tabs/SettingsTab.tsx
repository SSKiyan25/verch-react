"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { ProductWithDetails } from "@/lib/types/product";

interface SettingsTabProps {
  product: ProductWithDetails;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SettingsTab({ product }: SettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Settings className="w-5 h-5" />
          Product Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Product settings will be displayed here
        </p>
      </CardContent>
    </Card>
  );
}
