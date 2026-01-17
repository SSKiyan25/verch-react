"use client";

import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ProductsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Products
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization products
          </p>
        </div>
      </div>
      <Link href="/org/products/create">
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </Link>
    </div>
  );
}
