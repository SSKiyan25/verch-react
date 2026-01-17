"use client";

import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export function ProductsEmpty() {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <Package className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No products yet</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Get started by creating your first product. You can add product
          details, images, pricing, and inventory information.
        </p>
        <Link href="/org/products/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Product
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
