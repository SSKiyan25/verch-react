"use client";

import { useCallback, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import type { PublicProductDetail } from "@/lib/supabase/queries/products";
import type { ProductActivePromotion } from "@/lib/types/public-promotions";
import { useProductVariant } from "../hooks/useProductVariant";
import { useAddToCart } from "../hooks/useAddToCart";
import { ProductBreadcrumb } from "./ProductBreadcrumb";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductInfo } from "./ProductInfo";
import { ProductVariantCards } from "./ProductVariantCards";
import { ProductVariantSheet } from "./ProductVariantSheet";
import { ProductActions } from "./ProductActions";
import { ProductOrganizationCard } from "./ProductOrganizationCard";
import { ProductSupplierCard } from "./ProductSupplierCard";
import { MiniCartDrawer, type MiniCartInfo } from "./MiniCartDrawer";

type ProductDetailProps = {
  product: PublicProductDetail;
  isAuthenticated: boolean;
  promotions?: ProductActivePromotion[];
};

export function ProductDetail({
  product,
  isAuthenticated,
  promotions = [],
}: ProductDetailProps) {
  const {
    selectedVariation,
    normalizedVariations,
    selectVariation,
    isSheetOpen,
    sheetMode,
    openSheetForCart,
    openSheetForPreOrder,
    closeSheet,
  } = useProductVariant(product.variations);

  const { addToCart, isPending } = useAddToCart(isAuthenticated);

  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [miniCartInfo, setMiniCartInfo] = useState<MiniCartInfo | null>(null);

  const hasPurchasableVariations = useMemo(
    () => normalizedVariations.some((v) => v.is_available),
    [normalizedVariations],
  );

  /** Called when the sheet's action button is clicked */
  const handleSheetConfirm = useCallback(
    async (quantity: number) => {
      if (!selectedVariation) return;
      const success = await addToCart(
        selectedVariation.id,
        quantity,
        sheetMode === "preorder",
      );
      if (success) {
        closeSheet();
        setMiniCartInfo({
          productName: product.name,
          variationName: selectedVariation.variation_name ?? "Variant",
          unitPrice: selectedVariation.price,
          quantity,
          imageUrl: product.featured_photo_url,
          upsertResult: success.result,
        });
        setMiniCartOpen(true);
      }
    },
    [closeSheet, selectedVariation, addToCart, product, sheetMode],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <ProductBreadcrumb
            categories={product.category_breadcrumb}
            productName={product.name}
          />
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left — Image gallery */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <ProductImageGallery
              featuredUrl={product.featured_photo_url}
              photoUrls={product.photo_urls}
              productName={product.name}
            />
          </div>

          {/* Right — Product info + actions */}
          <div className="flex flex-col gap-8">
            {/* 1. Product name / badges / price / description */}
            <ProductInfo
              product={product}
              selectedVariation={selectedVariation}
              promotions={promotions}
            />

            {/* 2. Variant cards + CTA — visually grouped */}
            <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
              {normalizedVariations.length > 0 && (
                <>
                  <ProductVariantCards
                    variations={normalizedVariations}
                    selectedVariation={selectedVariation}
                    onSelectVariation={selectVariation}
                  />
                  <Separator />
                </>
              )}

              <ProductActions
                canPreOrder={product.can_pre_order}
                hasPurchasableVariations={hasPurchasableVariations}
                isPending={isPending}
                onAddToCart={openSheetForCart}
                onPreOrder={openSheetForPreOrder}
              />
            </div>

            {/* 3. Seller card */}
            <ProductOrganizationCard
              organizationId={product.organization_id}
              organizationName={product.organization_name}
              organizationLogoUrl={product.organization_logo_url}
            />

            {/* 4. Supplier card — only shown when supplier data exists */}
            {product.supplier_id && product.supplier_name && (
              <ProductSupplierCard
                supplierName={product.supplier_name}
                supplierEmail={product.supplier_email}
                supplierLinks={product.supplier_links}
              />
            )}
          </div>
        </div>
      </div>

      {/* Variant sheet — confirm selected variant + quantity */}
      <ProductVariantSheet
        open={isSheetOpen}
        onOpenChange={(open) => !open && !isPending && closeSheet()}
        mode={sheetMode}
        variations={normalizedVariations}
        selectedVariation={selectedVariation}
        onSelectVariation={selectVariation}
        onConfirm={handleSheetConfirm}
        isPending={isPending}
      />

      {/* Mini cart drawer — shown after successful add to cart */}
      <MiniCartDrawer
        open={miniCartOpen}
        onOpenChange={setMiniCartOpen}
        info={miniCartInfo}
      />
    </div>
  );
}
