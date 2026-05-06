"use client";

import Link from "next/link";
import { ShoppingCart, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CartEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
      {/* Icon with animated background */}
      <div className="relative mb-8">
        {/* Animated background ring */}
        <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-emerald-100 to-orange-100 opacity-60 animate-pulse" />
        <div className="relative rounded-full bg-gradient-to-br from-emerald-50 to-orange-50 p-6 shadow-sm">
          <ShoppingCart className="h-16 w-16 text-emerald-600" strokeWidth={1.5} />
        </div>
      </div>

      {/* Heading and description */}
      <h2 className="text-2xl font-bold mb-3 text-emerald-950">Your cart is empty</h2>
      <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
        Looks like you haven&apos;t added anything yet. Start exploring our
        products and discover amazing deals from verified stores!
      </p>

      {/* Call to action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button 
          asChild 
          size="lg" 
          className="group bg-emerald-600 hover:bg-emerald-700 transition-all duration-200"
        >
          <Link href="/products" className="gap-2">
            Browse Products
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button 
          asChild 
          size="lg" 
          variant="outline" 
          className="group border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
        >
          <Link href="/stores" className="gap-2">
            <Package className="h-4 w-4" />
            View Stores
          </Link>
        </Button>
      </div>

      {/* Optional: subtle decoration */}
      <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Verified sellers</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Exclusive deals</span>
        </div>
      </div>
    </div>
  );
}
