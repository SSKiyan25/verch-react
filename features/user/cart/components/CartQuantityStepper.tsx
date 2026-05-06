"use client";

import { useRef, useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CartQuantityStepperProps = {
  itemId: string;
  variationId: string;
  currentQuantity: number;
  availableQuantity: number;
  isPreOrder: boolean;
  isOverStock: boolean;
  disabled?: boolean;
  onQuantityChange: (
    itemId: string,
    newQuantity: number,
    delta: number,
  ) => void;
};

export function CartQuantityStepper({
  itemId,
  currentQuantity,
  availableQuantity,
  isPreOrder,
  isOverStock,
  disabled = false,
  onQuantityChange,
}: CartQuantityStepperProps) {
  const [inputValue, setInputValue] = useState(String(currentQuantity));
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when currentQuantity changes from parent
  useEffect(() => {
    setInputValue(String(currentQuantity));
  }, [currentQuantity]);

  function handleStep(delta: number) {
    const newQty = Math.max(1, currentQuantity + delta);
    setInputValue(String(newQty));
    onQuantityChange(itemId, newQty, newQty - currentQuantity);
  }

  function handleBlur() {
    let parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    setInputValue(String(parsed));

    if (parsed !== currentQuantity) {
      onQuantityChange(itemId, parsed, parsed - currentQuantity);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled || currentQuantity <= 1}
          onClick={() => handleStep(-1)}
          aria-label="Decrease quantity"
          className="cursor-pointer hover:bg-muted hover:border-emerald-300 transition-all duration-200"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="h-8 w-12 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-emerald-500 focus:ring-emerald-500 transition-colors duration-200"
        />
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          onClick={() => handleStep(1)}
          aria-label="Increase quantity"
          className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {!isPreOrder && (
        <p
          className={cn(
            "text-xs",
            isOverStock
              ? "text-amber-600 dark:text-amber-400 font-medium"
              : "text-muted-foreground",
          )}
        >
          {availableQuantity} available
        </p>
      )}
      {isPreOrder && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          Pre-order
        </p>
      )}
    </div>
  );
}
