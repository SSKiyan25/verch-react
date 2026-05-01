import React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { CategoryBreadcrumb } from "@/lib/supabase/queries/products";

type ProductBreadcrumbProps = {
  categories: CategoryBreadcrumb[];
  productName: string;
};

export function ProductBreadcrumb({
  categories,
  productName,
}: ProductBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/products">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {categories.map((cat) => (
          <React.Fragment key={cat.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-sm text-muted-foreground">{cat.name}</span>
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="max-w-[180px] truncate">
            {productName}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
