"use client";

import { useCategories } from "@/features/org/product/hooks/useCategories";

export function CategoriesTest() {
  const { categories, isLoading, error } = useCategories();

  return (
    <div className="p-4 border rounded">
      <h3>Categories Debug</h3>
      <p>Loading: {isLoading.toString()}</p>
      <p>Error: {error || "None"}</p>
      <p>Categories count: {categories.length}</p>
      <pre>{JSON.stringify(categories, null, 2)}</pre>
    </div>
  );
}
