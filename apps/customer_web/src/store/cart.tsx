import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CartLine, Product } from '../types';

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  add: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  quantityOf: (productId: string) => number;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const add = (product: Product) =>
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.productId === product.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            unitPrice: product.price,
            quantity: 1,
          },
        ];
      });

    const setQuantity = (productId: string, quantity: number) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
      );

    const quantityOf = (productId: string) =>
      lines.find((l) => l.productId === productId)?.quantity ?? 0;

    return {
      lines,
      itemCount: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      add,
      setQuantity,
      quantityOf,
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
