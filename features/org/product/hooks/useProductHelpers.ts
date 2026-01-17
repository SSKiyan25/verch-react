"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sanitizeInput } from "@/lib/hooks/use-input-validation";
import { mockCategories } from "@/features/org/products/utils/data";
import { ProductCategory, CreateProductData } from "@/lib/types/product";

export function useProductHelpers(
  data: CreateProductData,
  onChange: (updates: Partial<CreateProductData>) => void
) {
  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);

  const createSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleCreateCustomCategory = () => {
    const sanitizedName = sanitizeInput.text(customCategoryName.trim());

    if (!sanitizedName || sanitizedName.length < 2) {
      toast.error("Category name must be at least 2 characters");
      return;
    }

    if (sanitizedName.length > 100) {
      toast.error("Category name is too long (max 100 characters)");
      return;
    }

    // Check if category already exists (case-insensitive)
    const existingCategory = mockCategories.find(
      (cat) => cat.name.toLowerCase() === sanitizedName.toLowerCase()
    );

    if (existingCategory) {
      toast.error("Category already exists");
      onChange({ category_id: existingCategory.id });
      setIsCustomCategoryOpen(false);
      setCustomCategoryName("");
      return;
    }

    // Create new category with all required properties
    const newCategory: ProductCategory = {
      id: `custom_${Date.now()}`,
      name: sanitizedName,
      slug: createSlugFromName(sanitizedName),
      description: `Custom category: ${sanitizedName}`,
      parent_id: undefined,
      sort_order: mockCategories.length + 1,
      is_active: true,
      is_custom: true,
      icon: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to mock categories (in real app, this would be an API call)
    mockCategories.push(newCategory);

    // Set as selected category
    onChange({ category_id: newCategory.id });

    toast.success(`Category "${sanitizedName}" created successfully!`);
    setIsCustomCategoryOpen(false);
    setCustomCategoryName("");
  };

  const generateSmartKeywords = async (text: string): Promise<string[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simple keyword generation logic (replace with actual AI/NLP service)
    const words = text
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .map((word) => word.toLowerCase());

    // Extract unique words
    const uniqueWords = [...new Set(words)];

    // Generate some variations and common terms
    const keywords: string[] = [];

    // Add original words
    uniqueWords.slice(0, 5).forEach((word) => keywords.push(word));

    // Add some category-based keywords
    const selectedCategory = mockCategories.find(
      (cat) => cat.id === data.category_id
    );
    if (selectedCategory) {
      const categoryKeywords = selectedCategory.name.toLowerCase().split(" ");
      categoryKeywords.forEach((keyword) => {
        if (keyword.length > 2 && !keywords.includes(keyword)) {
          keywords.push(keyword);
        }
      });
    }

    // Add some common e-commerce keywords based on context
    const commonKeywords = [
      "quality",
      "premium",
      "durable",
      "affordable",
      "best",
      "new",
      "sale",
      "discount",
      "popular",
      "trending",
    ];

    // Randomly add some common keywords
    const randomCommon = commonKeywords
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    randomCommon.forEach((keyword) => {
      if (!keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    // Clean and validate keywords
    return keywords
      .map((keyword) => sanitizeInput.keyword(keyword))
      .filter((keyword) => keyword.length >= 2 && keyword.length <= 50)
      .slice(0, 8); // Return max 8 suggestions
  };

  const generateKeywords = async () => {
    if (!data.name || data.name.length < 2) {
      toast.error("Please enter a product name first to generate keywords");
      return;
    }

    setIsGeneratingKeywords(true);

    try {
      // Simulate keyword generation based on product name and description
      const productText = `${data.name} ${
        data.description || ""
      }`.toLowerCase();

      // Simple keyword extraction algorithm (in real app, you might use AI/NLP)
      const suggestedKeywords = await generateSmartKeywords(productText);

      // Filter out existing keywords
      const existingKeywords = data.search_keywords || [];
      const newKeywords = suggestedKeywords.filter(
        (keyword) => !existingKeywords.includes(keyword)
      );

      if (newKeywords.length === 0) {
        toast.info(
          "No new keywords found. Try adding more details to your product description."
        );
        return;
      }

      // Add new keywords (respecting the 10 keyword limit)
      const availableSlots = 10 - existingKeywords.length;
      const keywordsToAdd = newKeywords.slice(0, availableSlots);

      const updatedKeywords = [...existingKeywords, ...keywordsToAdd];
      onChange({ search_keywords: updatedKeywords });

      toast.success(`Added ${keywordsToAdd.length} suggested keyword(s)`);
    } catch (error) {
      console.error("Keyword generation error:", error);
      toast.error("Failed to generate keywords. Please try again.");
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  return {
    // Category helpers
    isCustomCategoryOpen,
    setIsCustomCategoryOpen,
    customCategoryName,
    setCustomCategoryName,
    handleCreateCustomCategory,

    // Keyword helpers
    isGeneratingKeywords,
    generateKeywords,
  };
}
