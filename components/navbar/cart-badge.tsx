"use client";

import { useCartStore } from "@/lib/stores/cart-store";

export function CartBadge() {
  const count = useCartStore((s) => s.count);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex min-w-[1rem] h-4 px-0.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground pointer-events-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}
