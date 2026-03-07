"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type StoresSearchBarProps = {
  defaultValue?: string;
};

export function StoresSearchBar({ defaultValue = "" }: StoresSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  function submitSearch(query: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    // Always reset to page 1 on new search
    params.delete("page");
    startTransition(() => {
      router.push(`/stores?${params.toString()}`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submitSearch(value);
    }
  }

  function handleClear() {
    setValue("");
    inputRef.current?.focus();
    submitSearch("");
  }

  return (
    <div className="relative flex w-full max-w-xl items-center">
      {/* Search icon */}
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search stores by name or keyword…"
        className="h-10 w-full rounded-xl border bg-card pl-9 pr-24 text-sm shadow-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-16 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground/30"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Search button */}
      <button
        type="button"
        onClick={() => submitSearch(value)}
        className="absolute right-2 h-7 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Search
      </button>
    </div>
  );
}
