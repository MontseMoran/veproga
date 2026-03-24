import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "shop-cart:v1";
const CartContext = createContext(null);

function readCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage failures.
    }
  }, [items]);

  const value = useMemo(() => {
    function addItem(item, quantity = 1) {
      const safeQuantity = Math.max(1, Number(quantity) || 1);
      const lineId = item.lineId || item.id;

      setItems((current) => {
        const existingIndex = current.findIndex((entry) => entry.lineId === lineId);

        if (existingIndex >= 0) {
          return current.map((entry, index) =>
            index === existingIndex
              ? { ...entry, quantity: entry.quantity + safeQuantity }
              : entry
          );
        }

        return [
          ...current,
          {
            id: item.id,
            lineId,
            slug: item.slug,
            name: item.name,
            price: Number(item.price || 0),
            imageUrl: item.imageUrl || "",
            color: item.color || "",
            size: item.size || "",
            variantId: item.variantId || "",
            variantSku: item.variantSku || "",
            quantity: safeQuantity,
          },
        ];
      });
    }

    function updateQuantity(lineId, quantity) {
      const safeQuantity = Math.max(1, Number(quantity) || 1);
      setItems((current) =>
        current.map((item) =>
          item.lineId === lineId ? { ...item, quantity: safeQuantity } : item
        )
      );
    }

    function removeItem(lineId) {
      setItems((current) => current.filter((item) => item.lineId !== lineId));
    }

    function clearCart() {
      setItems([]);
    }

    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );

    return {
      items,
      itemCount,
      total,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider.");
  }

  return context;
}
