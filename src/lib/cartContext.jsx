import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "shop-cart:v1";
const DISCOUNT_STORAGE_KEY = "shop-cart-discount:v1";
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

function readDiscount() {
  try {
    const raw = window.localStorage.getItem(DISCOUNT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getDiscountAmount(subtotal, discount) {
  if (!discount || !subtotal) return 0;
  if (!discount.is_active) return 0;

  const minOrderAmount = Number(discount.min_order_amount || 0);
  if (subtotal < minOrderAmount) return 0;

  const now = Date.now();
  const validFrom = discount.valid_from ? new Date(discount.valid_from).getTime() : null;
  const validUntil = discount.valid_until ? new Date(discount.valid_until).getTime() : null;

  if (validFrom && Number.isFinite(validFrom) && now < validFrom) return 0;
  if (validUntil && Number.isFinite(validUntil) && now > validUntil) return 0;

  if (
    discount.usage_limit &&
    Number(discount.usage_limit) > 0 &&
    Number(discount.times_used || 0) >= Number(discount.usage_limit)
  ) {
    return 0;
  }

  if (discount.type === "percent") {
    return subtotal * (Number(discount.value || 0) / 100);
  }

  if (discount.type === "fixed") {
    return Number(discount.value || 0);
  }

  return 0;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [appliedDiscount, setAppliedDiscountState] = useState(null);

  useEffect(() => {
    setItems(readCart());
    setAppliedDiscountState(readDiscount());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage failures.
    }
  }, [items]);

  useEffect(() => {
    try {
      if (appliedDiscount) {
        window.localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(appliedDiscount));
      } else {
        window.localStorage.removeItem(DISCOUNT_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }, [appliedDiscount]);

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
      setAppliedDiscountState(null);
    }

    function applyDiscount(discount) {
      setAppliedDiscountState(discount || null);
    }

    function clearDiscount() {
      setAppliedDiscountState(null);
    }

    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
    const discountAmount = Math.min(
      subtotal,
      Number(getDiscountAmount(subtotal, appliedDiscount).toFixed(2))
    );
    const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

    return {
      items,
      itemCount,
      subtotal,
      discountAmount,
      total,
      appliedDiscount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyDiscount,
      clearDiscount,
    };
  }, [appliedDiscount, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider.");
  }

  return context;
}
