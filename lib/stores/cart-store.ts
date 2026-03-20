// stores/cart-store.ts
import { create } from "zustand";

type CartStore = {
  count: number;
  setCount: (count: number) => void;
  increment: (by?: number) => void;
  decrement: (by?: number) => void;
};

export const useCartStore = create<CartStore>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  increment: (by = 1) => set((s) => ({ count: Math.max(0, s.count + by) })),
  decrement: (by = 1) => set((s) => ({ count: Math.max(0, s.count - by) })),
}));
