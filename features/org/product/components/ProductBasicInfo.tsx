"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus, AlertCircle, Wand2, Loader2 } from "lucide-react";
import { CreateProductData } from "@/lib/types/product";
import type { PublicCategory } from "@/lib/supabase/queries/categories";
import { useState } from "react";
import { useProductValidation } from "../hooks/useProductValidation";
import { useProductHelpers } from "../hooks/useProductHelpers";
import { toast } from "sonner";

interface ProductBasicInfoProps {
  data: CreateProductData;
  onChange: (updates: Partial<CreateProductData>) => void;
  categories: PublicCategory[];
}

export function ProductBasicInfo({
  data,
  onChange,
  categories,
}: ProductBasicInfoProps) {
  const [keywordInput, setKeywordInput] = useState("");

  const {
    errors,
    validateName,
    validateDescription,
    validateCategory,
    clearError,
    sanitizeName,
    sanitizeDescription,
    sanitizeKeyword,
    addKeyword,
    removeKeyword,
    isValidKeyword,
  } = useProductValidation(data);

  const { isGeneratingKeywords, generateKeywords } = useProductHelpers(
    data,
    onChange,
  );

  const handleNameChange = (value: string) => {
    const sanitized = sanitizeName(value);
    onChange({ name: sanitized });
    validateName(sanitized);
  };

  const handleDescriptionChange = (value: string) => {
    const sanitized = sanitizeDescription(value);
    onChange({ description: sanitized });
    validateDescription(sanitized);
  };

  const handleCategoryChange = (value: string) => {
    onChange({ category_id: value });
    validateCategory(value);
    clearError("category_id");
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;

    const result = addKeyword(keywordInput, data.search_keywords || []);

    if (result.success && result.keywords) {
      onChange({ search_keywords: result.keywords });
      setKeywordInput("");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = removeKeyword(keyword, data.search_keywords || []);
    onChange({ search_keywords: newKeywords });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleKeywordInputChange = (value: string) => {
    const sanitized = sanitizeKeyword(value);
    setKeywordInput(sanitized);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Product Name*
            {errors.name && (
              <span className="text-xs text-red-500 ml-2">({errors.name})</span>
            )}
          </Label>
          <Input
            id="name"
            placeholder="Enter product name"
            value={data.name || ""}
            onChange={(e) => handleNameChange(e.target.value)}
            className={errors.name ? "border-red-500" : ""}
            required
          />
          {errors.name && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description
            {data.description && (
              <span className="text-xs text-muted-foreground ml-2">
                ({data.description.length}/500)
              </span>
            )}
            {errors.description && (
              <span className="text-xs text-red-500 ml-2">
                ({errors.description})
              </span>
            )}
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your product..."
            value={data.description || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={4}
            className={`resize-none ${
              errors.description ? "border-red-500" : ""
            }`}
            maxLength={500}
          />
          {errors.description && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.description}
            </div>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">
            Category*
            {errors.category_id && (
              <span className="text-xs text-red-500 ml-2">
                ({errors.category_id})
              </span>
            )}
          </Label>
          <Select
            value={data.category_id ?? undefined}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger
              className={errors.category_id ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.category_id}
            </div>
          )}
        </div>

        {/* Search Keywords */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="keywords">
              Search Keywords
              {data.search_keywords && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({data.search_keywords.length}/10)
                </span>
              )}
              {errors.search_keywords && (
                <span className="text-xs text-red-500 ml-2">
                  ({errors.search_keywords})
                </span>
              )}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateKeywords}
              disabled={
                isGeneratingKeywords ||
                !data.name ||
                data.name.length < 2 ||
                (data.search_keywords && data.search_keywords.length >= 10)
              }
              className="text-xs"
            >
              {isGeneratingKeywords ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-3 h-3 mr-1" />
                  Auto-Generate
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                id="keywords"
                placeholder="Add search keywords"
                value={keywordInput}
                onChange={(e) => handleKeywordInputChange(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                className="flex-1"
                maxLength={50}
                disabled={
                  data.search_keywords && data.search_keywords.length >= 10
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddKeyword}
                disabled={
                  !keywordInput.trim() ||
                  !isValidKeyword(keywordInput) ||
                  (data.search_keywords && data.search_keywords.length >= 10)
                }
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {errors.search_keywords && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {errors.search_keywords}
              </div>
            )}

            {data.search_keywords && data.search_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.search_keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {keyword}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
