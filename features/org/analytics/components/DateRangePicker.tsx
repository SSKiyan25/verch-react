"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  format,
  subDays,
  startOfMonth,
  startOfYear,
  startOfDay,
} from "date-fns";
import { CalendarIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AnalyticsDateRange, AnalyticsGranularity } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function buildDefault(): AnalyticsDateRange {
  const today = new Date();
  return {
    start: toIso(subDays(today, 29)),
    end: toIso(today),
    granularity: "day",
  };
}

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  label: string;
  getValue: () => { start: string; end: string };
};

const PRESETS: Preset[] = [
  {
    label: "Today",
    getValue: () => {
      const today = toIso(new Date());
      return { start: today, end: today };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => ({
      start: toIso(subDays(new Date(), 6)),
      end: toIso(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      start: toIso(subDays(new Date(), 29)),
      end: toIso(new Date()),
    }),
  },
  {
    label: "Last 3 months",
    getValue: () => ({
      start: toIso(subDays(new Date(), 89)),
      end: toIso(new Date()),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      start: toIso(startOfMonth(new Date())),
      end: toIso(new Date()),
    }),
  },
  {
    label: "This year",
    getValue: () => ({
      start: toIso(startOfYear(new Date())),
      end: toIso(new Date()),
    }),
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRangePickerProps = {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
  className?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Local pending state — committed only on Apply / preset click
  const [pending, setPending] = React.useState<DateRange>({
    from: new Date(value.start),
    to: new Date(value.end),
  });
  const [granularity, setGranularity] = React.useState<AnalyticsGranularity>(
    value.granularity,
  );

  // Sync pending state when external value changes
  React.useEffect(() => {
    setPending({ from: new Date(value.start), to: new Date(value.end) });
    setGranularity(value.granularity);
  }, [value.start, value.end, value.granularity]);

  function applyRange(start: string, end: string, g: AnalyticsGranularity) {
    onChange({ start, end, granularity: g });
    setOpen(false);
  }

  function handlePreset(preset: Preset) {
    const { start, end } = preset.getValue();
    setPending({ from: new Date(start), to: new Date(end) });
    applyRange(start, end, granularity);
  }

  function handleApply() {
    if (!pending.from || !pending.to) return;
    applyRange(toIso(pending.from), toIso(pending.to), granularity);
  }

  function handleReset() {
    const defaults = buildDefault();
    setPending({ from: new Date(defaults.start), to: new Date(defaults.end) });
    applyRange(defaults.start, defaults.end, "day");
  }

  const isInvalid = pending.from && pending.to && pending.from > pending.to;

  // Display label
  const displayLabel =
    value.start === value.end
      ? format(new Date(value.start), "MMM d, yyyy")
      : `${format(new Date(value.start), "MMM d, yyyy")} – ${format(new Date(value.end), "MMM d, yyyy")}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Preset Quick Buttons (desktop) */}
      <div className="hidden sm:flex items-center flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Granularity Selector */}
      <Select
        value={granularity}
        onValueChange={(v) => setGranularity(v as AnalyticsGranularity)}
      >
        <SelectTrigger className="h-9 w-[100px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Daily</SelectItem>
          <SelectItem value="week">Weekly</SelectItem>
          <SelectItem value="month">Monthly</SelectItem>
        </SelectContent>
      </Select>

      {/* Calendar Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-2 text-xs font-medium min-w-[220px] justify-start"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left truncate">{displayLabel}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col sm:flex-row">
            {/* Mobile preset list */}
            <div className="sm:hidden border-b p-3 flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                selected={pending}
                onSelect={(range) => {
                  if (range) setPending(range);
                }}
                numberOfMonths={2}
                disabled={{ after: startOfDay(new Date()) }}
                initialFocus
              />

              {isInvalid && (
                <p className="mt-2 text-xs text-destructive text-center">
                  Start date must not be after end date.
                </p>
              )}

              <div className="mt-3 flex justify-between items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1.5"
                  onClick={handleReset}
                >
                  <RefreshCwIcon className="h-3 w-3" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  disabled={!pending.from || !pending.to || !!isInvalid}
                  onClick={handleApply}
                  className="text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── URL-synced variant ───────────────────────────────────────────────────────
// Reads/writes date range to URL search params.
// Use this directly in page components.

export function DateRangePickerWithUrl({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultRange = buildDefault();

  const value: AnalyticsDateRange = {
    start: searchParams.get("start") ?? defaultRange.start,
    end: searchParams.get("end") ?? defaultRange.end,
    granularity:
      (searchParams.get("granularity") as AnalyticsGranularity) ?? "day",
  };

  function handleChange(range: AnalyticsDateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", range.start);
    params.set("end", range.end);
    params.set("granularity", range.granularity);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <DateRangePicker
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
}
