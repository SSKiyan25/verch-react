"use client";

import { useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import type { PublicProductDetail } from "@/lib/supabase/queries/products";
import { useProductVariant } from "../hooks/useProductVariant";
import { usePreOrder } from "../hooks/usePreOrder";
import { ProductBreadcrumb } from "./ProductBreadcrumb";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductInfo } from "./ProductInfo";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { ProductVariantSheet } from "./ProductVariantSheet";
import { ProductActions } from "./ProductActions";
import { ProductOrganizationCard } from "./ProductOrganizationCard";
import { ProductSupplierCard } from "./ProductSupplierCard";
import { ProductPreOrderModal } from "./ProductPreOrderModal";

type ProductDetailProps = {
  product: PublicProductDetail;
};

export function ProductDetail({ product }: ProductDetailProps) {
  const {
    selectedVariation,
    normalizedVariations,
    selectVariation,
    isSheetOpen,
    sheetMode,
    openSheetForCart,
    openSheetForPreOrder,
    closeSheet,
    confirmSelection,
  } = useProductVariant(product.variations);

  const preOrderState = usePreOrder();

  /** Called when the sheet's action button is clicked */
  const handleSheetConfirm = useCallback(() => {
    confirmSelection();
    if (sheetMode === "preorder") {
      preOrderState.openModal();
    }
    // 'cart' mode: add-to-cart logic will go here in the future
  }, [confirmSelection, sheetMode, preOrderState]);

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
            />

            {/* 2. Variant cards + CTA — visually grouped */}
            <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
              {normalizedVariations.length > 0 && (
                <>
                  <ProductVariantSelector
                    variations={normalizedVariations}
                    selectedVariation={selectedVariation}
                    selectVariation={selectVariation}
                  />
                  <Separator />
                </>
              )}

              <ProductActions
                selectedVariation={selectedVariation}
                canPreOrder={product.can_pre_order}
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

      {/* Variant selection sheet */}
      {normalizedVariations.length > 0 && (
        <ProductVariantSheet
          open={isSheetOpen}
          onOpenChange={(open) => !open && closeSheet()}
          mode={sheetMode}
          variations={normalizedVariations}
          selectedVariation={selectedVariation}
          onSelectVariation={selectVariation}
          onConfirm={handleSheetConfirm}
        />
      )}

      {/* Pre-order modal — opened after sheet confirm when mode=preorder */}
      <ProductPreOrderModal
        open={preOrderState.isOpen}
        onOpenChange={(val) => {
          if (!val) preOrderState.closeModal();
        }}
        product={{
          id: product.id,
          name: product.name,
          featured_photo_url: product.featured_photo_url,
          organization_name: product.organization_name,
        }}
        selectedVariation={selectedVariation}
        preOrderState={preOrderState}
      />
    </div>
  );
}
