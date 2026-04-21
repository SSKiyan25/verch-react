"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// SegmentedControl — A React 19 compatible alternative to Radix Select
// Use for option selection when you have 2-5 options
// Avoids the React 19 compose-refs infinite loop bug (radix-ui/primitives#3799)
// ---------------------------------------------------------------------------

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string = string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
  /** When true, shows labels stacked vertically for longer text */
  orientation?: "horizontal" | "vertical";
};

const sizeClasses = {
  sm: "h-8 text-xs px-2.5",
  default: "h-9 text-sm px-3",
  lg: "h-10 text-sm px-4",
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  disabled = false,
  className,
  size = "default",
  orientation = "horizontal",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-disabled={disabled}
      className={cn(
        "inline-flex rounded-md border border-input bg-muted/30 p-0.5",
        orientation === "vertical" && "flex-col",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                onValueChange(option.value);
              }
            }}
            className={cn(
              // Base styles
              "relative inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 cursor-pointer",
              sizeClasses[size],
              // Border radius based on position
              orientation === "horizontal" && [
                index === 0 && "rounded-l-[5px]",
                index === options.length - 1 && "rounded-r-[5px]",
                index !== 0 && index !== options.length - 1 && "rounded-none",
              ],
              orientation === "vertical" && [
                index === 0 && "rounded-t-[5px]",
                index === options.length - 1 && "rounded-b-[5px]",
                index !== 0 && index !== options.length - 1 && "rounded-none",
              ],
              // Selected state
              isSelected && [
                "bg-background text-foreground shadow-sm",
                "ring-1 ring-border/50",
              ],
              // Unselected state
              !isSelected && [
                "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              ],
              // Disabled state
              isDisabled && "cursor-not-allowed opacity-50",
              // Focus state
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControlCard — For options with descriptions (larger touch targets)
// ---------------------------------------------------------------------------

type SegmentedControlCardProps<T extends string = string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  columns?: 1 | 2 | 3;
};

export function SegmentedControlCard<T extends string = string>({
  options,
  value,
  onValueChange,
  disabled = false,
  className,
  columns = 1,
}: SegmentedControlCardProps<T>) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div
      role="radiogroup"
      aria-disabled={disabled}
      className={cn(
        "grid gap-2",
        gridCols[columns],
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                onValueChange(option.value);
              }
            }}
            className={cn(
              // Base styles
              "relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer",
              // Selected state
              isSelected && [
                "border-primary bg-primary/5 ring-1 ring-primary/20",
              ],
              // Unselected state
              !isSelected && [
                "border-input bg-background hover:border-muted-foreground/30 hover:bg-muted/30",
              ],
              // Disabled state
              isDisabled && "cursor-not-allowed opacity-50",
              // Focus state
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
          >
            <span
              className={cn(
                "text-sm font-medium",
                isSelected ? "text-primary" : "text-foreground",
              )}
            >
              {option.label}
            </span>
            {option.description && (
              <span className="text-xs text-muted-foreground leading-snug">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
