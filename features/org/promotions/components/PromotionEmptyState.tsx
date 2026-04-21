"use client";

import { Percent, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type PromotionEmptyStateProps = {
  hasFilters: boolean;
};

export function PromotionEmptyState({ hasFilters }: PromotionEmptyStateProps) {
  if (hasFilters) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <Percent className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No promotions found</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            No promotions match your current filters. Try adjusting your search
            or filter criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <Percent className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No promotions yet</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Create your first promotion to offer discounts and special deals to
          your customers. You can create percentage discounts, fixed amount
          discounts, or free item promotions.
        </p>
        <Link href="/org/promotions/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Promotion
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
