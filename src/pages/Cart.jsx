import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cartContext";
import { downloadReceipt } from "../lib/orderReceipt";
import { useSeo } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import "../styles/cart.scss";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

const PAYMENT_OPTIONS = [
  { value: "bizum", label: "Bizum" },
  { value: "transferencia", label: "Transferencia" },
];

const DELIVERY_OPTIONS = [
  { value: "shipping", label: "Envío a domicilio" },
  { value: "pickup", label: "Recogida en tienda" },
];

const PAYMENT_DETAILS = {
  bizum: {
    title: "Pago por Bizum",
    value: "647080364",
    help: "Envía el importe exacto a este número.",
  },
  transferencia: {
    title: "Pago por transferencia",
    value: "ES0420800371353040007167",
    help: "Haz la transferencia a este IBAN.",
  },
  tienda: {
    title: "Pago en tienda",
    value: "",
    help: "El pago se realizará al recoger el pedido en tienda.",
  },
};

const FREE_SHIPPING_THRESHOLD = 60;
const STANDARD_SHIPPING_EUR = 4.95;
const HEAVY_SHIPPING_EUR = 7.95;

function isHeavyShippingItem(item) {
  return Boolean(item?.isHeavyShipping);
}

function getShippingSummary(items, merchandiseTotal, deliveryMethod) {
  if (deliveryMethod === "pickup") {
    return {
      shippingAmount: 0,
      qualifiesForFreeShipping: false,
      hasHeavyItems: false,
      label: "Recogida en tienda",
    };
  }

  const normalizedMerchandiseTotal = Number(merchandiseTotal || 0);
  const qualifiesForFreeShipping = normalizedMerchandiseTotal >= FREE_SHIPPING_THRESHOLD;
  const hasHeavyItems = items.some((item) => isHeavyShippingItem(item));
  const shippingAmount = qualifiesForFreeShipping
    ? 0
    : hasHeavyItems
      ? HEAVY_SHIPPING_EUR
      : STANDARD_SHIPPING_EUR;

  return {
    shippingAmount,
    qualifiesForFreeShipping,
    hasHeavyItems,
    label: qualifiesForFreeShipping
      ? `Gratis desde ${formatPrice(FREE_SHIPPING_THRESHOLD)}`
      : hasHeavyItems
        ? "Envío ropa de cama pesada"
        : "Envío estándar",
  };
}

function formatPaymentValue(method, value) {
  const normalizedValue = String(value || "").replaceAll(/\s+/g, "");

  if (method === "bizum") {
    return normalizedValue.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  if (method === "transferencia") {
    return normalizedValue.replace(/(.{4})(?=.)/g, "$1 ").trim();
  }

  return value;
}

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
}

function paymentLabel(value) {
  if (value === "tienda") {
    return "Pago en tienda";
  }

  return PAYMENT_OPTIONS.find((option) => option.value === value)?.label || "No especificado";
}

async function getFunctionErrorMessage(error, fallbackMessage) {
  const defaultMessage = fallbackMessage || "No se pudo completar la solicitud.";

  if (!error) {
    return defaultMessage;
  }

  const directMessage = String(error?.message || "").trim();

  if (
    directMessage &&
    !directMessage.includes("Edge Function returned a non-2xx status code")
  ) {
    return directMessage;
  }

  const response = error?.context;

  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      const apiMessage = String(payload?.error || payload?.message || "").trim();

      if (apiMessage) {
        return apiMessage;
      }
    } catch {
      // Ignore JSON parse failures and try plain text below.
    }

    try {
      const text = String(await response.clone().text()).trim();

      if (text) {
        return text;
      }
    } catch {
      // Ignore text parse failures.
    }
  }

  return directMessage || defaultMessage;
}

export default function Cart() {
  const {
    items,
    subtotal,
    discountAmount,
    total,
    appliedDiscount,
    updateQuantity,
    removeItem,
    clearCart,
    applyDiscount,
    clearDiscount,
  } = useCart();

  const [code, setCode] = useState(appliedDiscount?.code || "");
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddress2, setDeliveryAddress2] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryProvince, setDeliveryProvince] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("shipping");
  const [paymentMethod, setPaymentMethod] = useState("bizum");
  const [orderNotes, setOrderNotes] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(!TURNSTILE_SITE_KEY);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const turnstileContainerId = "cart-turnstile";
  const turnstileWidgetIdRef = useRef(null);
  const turnstileContainerRef = useRef(null);
  const checkoutPanelRef = useRef(null);
const captchaEnabled = false;
const captchaValidated = true;
  const isMobileViewportRef = useRef(false);

  function getCaptchaTokenValue() {
    if (captchaToken) {
      return captchaToken;
    }

    if (typeof document === "undefined") {
      return "";
    }

    const container = document.getElementById(turnstileContainerId);
    const tokenField =
      container?.querySelector('input[name="cf-turnstile-response"]') ||
      document.querySelector('input[name="cf-turnstile-response"]');

    return String(tokenField?.value || "").trim();
  }

  useEffect(() => {
    setCode(appliedDiscount?.code || "");
  }, [appliedDiscount?.code]);

  useEffect(() => {
    if (deliveryMethod === "pickup") {
      setPaymentMethod("tienda");
      return;
    }

    setPaymentMethod((current) => (current === "tienda" ? "bizum" : current));
  }, [deliveryMethod]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !showCheckoutForm) return undefined;

    let cancelled = false;
    let loadTimeoutId = null;
    let readinessIntervalId = null;
    let renderFrameId = null;
    let renderRetryTimeoutId = null;
    let retryAttempts = 0;
    let resizeObserver = null;

    function clearRenderTimers() {
      if (renderFrameId) {
        window.cancelAnimationFrame(renderFrameId);
        renderFrameId = null;
      }

      if (renderRetryTimeoutId) {
        window.clearTimeout(renderRetryTimeoutId);
        renderRetryTimeoutId = null;
      }
    }

    function scheduleRender(delay = 0) {
      if (cancelled) return;

      clearRenderTimers();
      renderRetryTimeoutId = window.setTimeout(() => {
        renderRetryTimeoutId = null;
        renderTurnstile();
      }, delay);
    }

    function renderTurnstile() {
      if (cancelled || !window.turnstile) return;

      const container =
        turnstileContainerRef.current || document.getElementById(turnstileContainerId);
      if (!container || container.dataset.rendered === "true") return;

      setCaptchaLoadError("");
      setCaptchaReady(false);
      clearRenderTimers();

      renderFrameId = window.requestAnimationFrame(() => {
        if (cancelled || !window.turnstile || container.dataset.rendered === "true") return;
        const hasLayout = container.offsetWidth > 0 && container.offsetHeight > 0;

        if (!hasLayout) {
          if (retryAttempts < 12) {
            retryAttempts += 1;
            scheduleRender(180);
          }
          return;
        }

        isMobileViewportRef.current = window.matchMedia("(max-width: 599px)").matches;

        turnstileWidgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          size: isMobileViewportRef.current ? "normal" : "flexible",
          appearance: "always",
          callback: (token) => setCaptchaToken(token || ""),
          "expired-callback": () => setCaptchaToken(""),
          "error-callback": () => {
            setCaptchaToken("");
            setCaptchaLoadError(
              "No se pudo cargar la verificación anti-spam. Revisa bloqueadores, extensiones o prueba a recargar."
            );
          },
        });

        container.dataset.rendered = "true";
        retryAttempts = 0;
        setCaptchaReady(true);

        if (loadTimeoutId) {
          window.clearTimeout(loadTimeoutId);
        }
      });
    }

    function handleScriptError() {
      setCaptchaReady(false);
      setCaptchaLoadError(
        "No se pudo cargar la verificación anti-spam. Revisa bloqueadores, extensiones o prueba a recargar."
      );
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

    loadTimeoutId = window.setTimeout(() => {
      if (!window.turnstile) {
        handleScriptError();
      }
    }, 6000);

    readinessIntervalId = window.setInterval(() => {
      if (window.turnstile) {
        renderTurnstile();
      }
    }, 250);

    if (existingScript) {
      if (window.turnstile) {
        scheduleRender(120);
      } else {
        existingScript.addEventListener("load", renderTurnstile, { once: true });
        existingScript.addEventListener("error", handleScriptError, { once: true });
      }

      return () => {
        cancelled = true;
        if (loadTimeoutId) {
          window.clearTimeout(loadTimeoutId);
        }
        if (readinessIntervalId) {
          window.clearInterval(readinessIntervalId);
        }
        clearRenderTimers();
        resizeObserver?.disconnect();
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("orientationchange", handleViewportChange);
        window.removeEventListener("pageshow", handleViewportChange);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderTurnstile, { once: true });
    script.addEventListener("error", handleScriptError, { once: true });
    document.head.appendChild(script);

    function handleViewportChange() {
      const container =
        turnstileContainerRef.current || document.getElementById(turnstileContainerId);
      if (!container || container.dataset.rendered === "true") return;
      scheduleRender(120);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        handleViewportChange();
      }
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("pageshow", handleViewportChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const observedContainer =
      turnstileContainerRef.current || document.getElementById(turnstileContainerId);
    if (observedContainer && typeof window.ResizeObserver === "function") {
      resizeObserver = new window.ResizeObserver(() => handleViewportChange());
      resizeObserver.observe(observedContainer);
    }

    return () => {
      cancelled = true;
      if (loadTimeoutId) {
        window.clearTimeout(loadTimeoutId);
      }
      if (readinessIntervalId) {
        window.clearInterval(readinessIntervalId);
      }
      clearRenderTimers();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("pageshow", handleViewportChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showCheckoutForm, turnstileContainerId]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !showCheckoutForm || !window.turnstile) return;
    if (turnstileWidgetIdRef.current === null) return;

    const isMobileViewport = window.matchMedia("(max-width: 599px)").matches;
    if (isMobileViewport !== isMobileViewportRef.current) {
      const container =
        turnstileContainerRef.current || document.getElementById(turnstileContainerId);
      if (container) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
        container.innerHTML = "";
        delete container.dataset.rendered;
        setCaptchaReady(false);
      }
      return;
    }

    setCaptchaToken("");
    window.turnstile.reset(turnstileWidgetIdRef.current);
  }, [deliveryMethod, showCheckoutForm]);

  useEffect(() => {
    if (!showCheckoutForm || !checkoutPanelRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isMobileViewport = window.matchMedia("(max-width: 899px)").matches;

      checkoutPanelRef.current?.scrollIntoView({
        behavior: prefersReducedMotion || isMobileViewport ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [showCheckoutForm]);

  const orderItems = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.id,
        variant_id: item.variantId || null,
        name: item.name,
        slug: item.slug,
        color: item.color || "",
        size: item.size || "",
        is_heavy_shipping: Boolean(item.isHeavyShipping),
        category_slug: item.categorySlug || "",
        category_name: item.categoryName || "",
        variant_sku: item.variantSku || "",
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.price || 0),
        line_total: Number(item.price || 0) * Number(item.quantity || 0),
      })),
    [items]
  );

  const merchandiseTotal = useMemo(
    () => Math.max(0, Number((subtotal - discountAmount).toFixed(2))),
    [subtotal, discountAmount]
  );

  const shippingSummary = useMemo(
    () => getShippingSummary(items, merchandiseTotal, deliveryMethod),
    [deliveryMethod, items, merchandiseTotal]
  );

  const isPickup = deliveryMethod === "pickup";
  const finalTotal = useMemo(
    () => Number((merchandiseTotal + shippingSummary.shippingAmount).toFixed(2)),
    [merchandiseTotal, shippingSummary.shippingAmount]
  );

  const paymentDetail = PAYMENT_DETAILS[paymentMethod] || PAYMENT_DETAILS.bizum;

  async function handleApplyDiscount(event) {
    event.preventDefault();
    setDiscountMsg("");
    setDiscountError("");

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setDiscountError("Introduce un código de descuento.");
      return;
    }

    setCheckingCode(true);

    const { data, error } = await supabase
      .from("shop_discount_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    setCheckingCode(false);

    if (error) {
      setDiscountError("No se pudo validar el código ahora mismo.");
      return;
    }

    if (!data) {
      setDiscountError("Ese código no existe.");
      return;
    }

    if (!data.is_active) {
      setDiscountError("Ese código no está activo.");
      return;
    }

    const validFrom = data.valid_from ? new Date(data.valid_from).getTime() : null;
    const validUntil = data.valid_until ? new Date(data.valid_until).getTime() : null;
    const now = Date.now();

    if (validFrom && Number.isFinite(validFrom) && now < validFrom) {
      setDiscountError("Ese código todavía no está disponible.");
      return;
    }

    if (validUntil && Number.isFinite(validUntil) && now > validUntil) {
      setDiscountError("Ese código ya ha caducado.");
      return;
    }

    if (subtotal < Number(data.min_order_amount || 0)) {
      setDiscountError(
        `Este código requiere un pedido mínimo de ${formatPrice(data.min_order_amount || 0)}.`
      );
      return;
    }

    if (
      data.usage_limit &&
      Number(data.usage_limit) > 0 &&
      Number(data.times_used || 0) >= Number(data.usage_limit)
    ) {
      setDiscountError("Ese código ya ha agotado sus usos.");
      return;
    }

    applyDiscount(data);
    setDiscountMsg("Código aplicado correctamente.");
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    setOrderError("");
    setOrderSuccess("");

    const resolvedCaptchaToken = null;

    if (!items.length) {
      setOrderError("Tu carrito está vacío.");
      return;
    }

    if (!acceptedPrivacy) {
      setOrderError("Debes aceptar la política de privacidad para enviar el pedido.");
      return;
    }

    if (!supabase) {
      setOrderError("Supabase no está configurado.");
      return;
    }

    if (captchaEnabled && !resolvedCaptchaToken) {
      setOrderError("Completa la verificación CAPTCHA antes de enviar el pedido.");
      return;
    }

    const payload = {
      created_at: new Date().toLocaleString("es-ES"),
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim().toLowerCase(),
        phone: customerPhone.trim(),
      },
      delivery: {
        method: deliveryMethod,
        address_line_1: isPickup ? "Recogida en tienda" : deliveryAddress.trim(),
        address_line_2: isPickup ? "Pago en tienda" : deliveryAddress2.trim(),
        postal_code: isPickup ? "RECOGIDA" : deliveryPostalCode.trim(),
        city: isPickup ? "Recogida en tienda" : deliveryCity.trim(),
        province: isPickup ? "Recogida en tienda" : deliveryProvince.trim(),
      },
      payment_method: paymentMethod,
      notes: orderNotes.trim(),
      items: orderItems,
      subtotal,
      merchandise_total: merchandiseTotal,
      discount_amount: discountAmount,
      shipping_amount: shippingSummary.shippingAmount,
      shipping_label: shippingSummary.label,
      total: finalTotal,
      applied_discount: appliedDiscount
        ? {
          code: appliedDiscount.code,
          description: appliedDiscount.description || "",
          type: appliedDiscount.type,
          value: appliedDiscount.value,
        }
        : null,
      captcha_token: resolvedCaptchaToken,
    };

    setSubmittingOrder(true);

    const { data, error } = await supabase.functions.invoke("submit-order", {
      body: payload,
    });

    setSubmittingOrder(false);

    if (error) {
      setOrderError(await getFunctionErrorMessage(error, "No se pudo enviar el pedido. Inténtalo de nuevo."));
      return;
    }

    const finalReference = data?.reference || "";
    const warning = data?.warning || "";

    const receiptSnapshot = {
      reference: finalReference,
      created_at: payload.created_at,
      customer: payload.customer,
      delivery: payload.delivery,
      payment_method: payload.payment_method,
      payment_method_label: paymentLabel(payload.payment_method),
      notes: payload.notes,
      items: orderItems.map((item) => ({
        name: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      })),
      subtotal,
      merchandise_total: merchandiseTotal,
      discount_amount: discountAmount,
      shipping_amount: shippingSummary.shippingAmount,
      shipping_label: shippingSummary.label,
      total: finalTotal,
    };

    clearCart();
    setShowCheckoutForm(false);
    setCode("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setDeliveryAddress2("");
    setDeliveryPostalCode("");
    setDeliveryCity("");
    setDeliveryProvince("");
    setDeliveryMethod("shipping");
    setPaymentMethod("bizum");
    setOrderNotes("");
    setAcceptedPrivacy(false);
    setCaptchaToken("");
    setOrderReference(finalReference);
    setReceiptData(receiptSnapshot);
    setOrderSuccess(
      warning || "Pedido enviado correctamente. Ya puedes descargar el albarán del pedido."
    );

    if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  return (
    <main className="cart-page">
      <div className="cart-page__container">
        <header className="cart-page__header reveal-on-scroll" style={{ "--reveal-delay": "40ms" }}>
          <h1>Carrito</h1>
          <div className="cart-page__headerActions">
            <Link to="/tienda" className="cart-page__continue cart-page__continue--ghost">
              Seguir comprando
            </Link>

            {items.length > 0 ? (
              <button type="button" className="cart-page__clear" onClick={clearCart}>
                Vaciar carrito
              </button>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="cart-page__empty reveal-on-scroll" style={{ "--reveal-delay": "100ms" }}>
            <p>Tu carrito está vacío.</p>

            {orderSuccess ? (
              <div className="cart-page__orderNotice cart-page__orderNotice--success">
                <p>{orderSuccess}</p>
                {orderReference ? <p>Referencia: {orderReference}</p> : null}

                {receiptData ? (
                  <div className="cart-page__receiptActions">
                    <button type="button" onClick={() => downloadReceipt(receiptData)}>
                      Descargar albarán
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <Link to="/tienda" className="cart-page__continue">
              Seguir comprando
            </Link>
          </div>
        ) : (
          <>
            <section className="cart-page__layout">
              <div className="cart-page__list">
                {items.map((item, index) => (
                  <article
                    key={item.lineId || item.id}
                    className="cart-page__item reveal-on-scroll"
                    style={{ "--reveal-delay": `${100 + index * 50}ms` }}
                  >
                    <Link
                      to={`/producto/${item.slug}`}
                      state={{ backTo: "/carrito" }}
                      className="cart-page__imageWrap"
                    >
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : null}
                    </Link>

                    <div className="cart-page__itemBody">
                      <Link
                        to={`/producto/${item.slug}`}
                        state={{ backTo: "/carrito" }}
                        className="cart-page__name"
                      >
                        {item.name}
                      </Link>

                      {item.color || item.size ? (
                        <p className="cart-page__meta">
                          {item.color ? `Color: ${item.color}` : null}
                          {item.color && item.size ? " · " : null}
                          {item.size ? `Talla: ${item.size}` : null}
                        </p>
                      ) : null}

                      <p className="cart-page__price">{formatPrice(item.price)}</p>

                      <div className="cart-page__controls">
                        <label className="cart-page__qty">
                          <span>Cantidad</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(item.lineId || item.id, event.target.value)
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="cart-page__remove"
                          onClick={() => removeItem(item.lineId || item.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    <p className="cart-page__lineTotal">{formatPrice(item.price * item.quantity)}</p>
                  </article>
                ))}
              </div>

              <aside
                className="cart-page__summary reveal-on-scroll"
                style={{ "--reveal-delay": "140ms" }}
              >
                <form className="cart-page__discount" onSubmit={handleApplyDiscount}>
                  <label htmlFor="cart-discount-code" className="cart-page__summaryLabel">
                    Código de descuento
                  </label>

                  <div className="cart-page__discountRow">
                    <input
                      id="cart-discount-code"
                      type="text"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Escribe tu código"
                    />
                    <button type="submit" className="cart-page__discountBtn" disabled={checkingCode}>
                      {checkingCode ? "Comprobando..." : "Aplicar"}
                    </button>
                  </div>

                  {discountError ? (
                    <p className="cart-page__discountMsg cart-page__discountMsg--error">
                      {discountError}
                    </p>
                  ) : null}

                  {discountMsg ? <p className="cart-page__discountMsg">{discountMsg}</p> : null}

                  {appliedDiscount ? (
                    <div className="cart-page__appliedDiscount">
                      <p>
                        <strong>{appliedDiscount.code}</strong>
                        {appliedDiscount.description ? ` · ${appliedDiscount.description}` : ""}
                      </p>
                      <button type="button" onClick={clearDiscount}>
                        Quitar
                      </button>
                    </div>
                  ) : null}
                </form>

                <div className="cart-page__summaryRows">
                  <div className="cart-page__summaryRow">
                    <p className="cart-page__summaryLabel">Subtotal</p>
                    <p className="cart-page__summaryNumber">{formatPrice(subtotal)}</p>
                  </div>

                  {discountAmount > 0 ? (
                    <div className="cart-page__summaryRow cart-page__summaryRow--discount">
                      <p className="cart-page__summaryLabel">Descuento</p>
                      <p className="cart-page__summaryNumber">-{formatPrice(discountAmount)}</p>
                    </div>
                  ) : null}

                  <div className="cart-page__summaryRow">
                    <p className="cart-page__summaryLabel">{shippingSummary.label}</p>
                    <p className="cart-page__summaryNumber">
                      {shippingSummary.shippingAmount > 0
                        ? formatPrice(shippingSummary.shippingAmount)
                        : "Gratis"}
                    </p>
                  </div>
                </div>

                <p className="cart-page__summaryLabel">Total</p>
                <p className="cart-page__summaryValue">{formatPrice(finalTotal)}</p>
                <p className="cart-page__summaryText">
                  Puedes elegir entre envío a domicilio o recogida en tienda. En envío, es gratis
                  a partir de {formatPrice(FREE_SHIPPING_THRESHOLD)}.
                </p>
                <p className="cart-page__summaryText">
                  El teléfono podrá incluirse en la documentación de entrega cuando sea
                  necesario para gestionar el envío.
                </p>

                <button
                  type="button"
                  className="cart-page__checkoutToggle"
                  onClick={() => setShowCheckoutForm((current) => !current)}
                >
                  {showCheckoutForm ? "Ocultar datos del pedido" : "Finalizar compra"}
                </button>
              </aside>
            </section>

            <form
              ref={checkoutPanelRef}
              className="cart-page__checkoutPanel"
              onSubmit={handleSubmitOrder}
              hidden={!showCheckoutForm}
              aria-hidden={!showCheckoutForm}
            >
                <h2 className="cart-page__orderTitle">Datos del pedido</h2>

                <div className="cart-page__orderForm">
                  <div className="cart-page__field cart-page__field--full">
                    <span>Entrega</span>
                    <div className="cart-page__paymentOptions">
                      {DELIVERY_OPTIONS.map((option) => (
                        <label key={option.value} className="cart-page__paymentOption">
                          <input
                            type="radio"
                            name="delivery_method"
                            value={option.value}
                            checked={deliveryMethod === option.value}
                            onChange={(event) => setDeliveryMethod(event.target.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="cart-page__field">
                    <span>Nombre y apellidos</span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      required
                    />
                  </label>

                  <label className="cart-page__field">
                    <span>Correo electrónico</span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      required
                    />
                  </label>

                  <label className="cart-page__field">
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      required
                    />
                  </label>

                  {isPickup ? (
                    <div className="cart-page__paymentInfo cart-page__field--full">
                      <p className="cart-page__paymentInfoTitle">Recogida en tienda</p>
                      <p className="cart-page__paymentInfoText">
                        No se aplicarán gastos de envío. Usaremos tu teléfono o correo para
                        coordinar la recogida del pedido.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="cart-page__field cart-page__field--full">
                        <span>Dirección de entrega</span>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(event) => setDeliveryAddress(event.target.value)}
                          required={!isPickup}
                        />
                      </label>

                      <label className="cart-page__field cart-page__field--full">
                        <span>Piso, puerta o información adicional</span>
                        <input
                          type="text"
                          value={deliveryAddress2}
                          onChange={(event) => setDeliveryAddress2(event.target.value)}
                        />
                      </label>

                      <label className="cart-page__field">
                        <span>Código postal</span>
                        <input
                          type="text"
                          value={deliveryPostalCode}
                          onChange={(event) => setDeliveryPostalCode(event.target.value)}
                          required={!isPickup}
                        />
                      </label>

                      <label className="cart-page__field">
                        <span>Ciudad</span>
                        <input
                          type="text"
                          value={deliveryCity}
                          onChange={(event) => setDeliveryCity(event.target.value)}
                          required={!isPickup}
                        />
                      </label>

                      <label className="cart-page__field cart-page__field--full">
                        <span>Provincia</span>
                        <input
                          type="text"
                          value={deliveryProvince}
                          onChange={(event) => setDeliveryProvince(event.target.value)}
                          required={!isPickup}
                        />
                      </label>
                    </>
                  )}

                  {isPickup ? null : (
                    <div className="cart-page__field cart-page__field--full">
                      <span>Forma de pago</span>
                      <div className="cart-page__paymentOptions">
                        {PAYMENT_OPTIONS.map((option) => (
                          <label key={option.value} className="cart-page__paymentOption">
                            <input
                              type="radio"
                              name="payment_method"
                              value={option.value}
                              checked={paymentMethod === option.value}
                              onChange={(event) => setPaymentMethod(event.target.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="cart-page__paymentInfo cart-page__field--full">
                    <p className="cart-page__paymentInfoTitle">{paymentDetail.title}</p>
                    {paymentDetail.value ? (
                      <p className="cart-page__paymentInfoValue">
                        {formatPaymentValue(paymentMethod, paymentDetail.value)}
                      </p>
                    ) : null}
                    <p className="cart-page__paymentInfoText">{paymentDetail.help}</p>
                    {!isPickup ? (
                      <p className="cart-page__paymentInfoConcept">
                        El concepto del pago se generará al confirmar el pedido.
                      </p>
                    ) : null}
                  </div>

                  <label className="cart-page__field cart-page__field--full">
                    <span>Notas del pedido</span>
                    <textarea
                      rows="4"
                      value={orderNotes}
                      onChange={(event) => setOrderNotes(event.target.value)}
                      placeholder="Horario de entrega, indicaciones o cualquier detalle útil."
                    />
                  </label>

                  <label className="cart-page__privacy cart-page__field--full">
                    <input
                      type="checkbox"
                      aria-label="Acepto la política de privacidad"
                      checked={acceptedPrivacy}
                      onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                    />
                    <span>
                      He leído y acepto la <Link to="/privacidad">política de privacidad</Link>.
                    </span>
                  </label>

                  {captchaEnabled ? (
                    <div className="cart-page__captcha cart-page__field--full">
                      <span>Verificación anti-spam</span>
                      <div id={turnstileContainerId} ref={turnstileContainerRef} />
                      {captchaLoadError ? (
                        <p className="cart-page__captchaHelp cart-page__captchaHelp--error">
                          {captchaLoadError}
                        </p>
                      ) : null}
                      {!captchaReady ? (
                        <p className="cart-page__captchaHelp">Cargando verificación...</p>
                      ) : null}
                      {captchaReady && !captchaLoadError && !captchaToken ? (
                        <p className="cart-page__captchaHelp">
                          Completa la verificación antes de enviar el pedido.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {orderError ? (
                  <div className="cart-page__orderNotice cart-page__orderNotice--error">
                    {orderError}
                  </div>
                ) : null}

                {orderSuccess ? (
                  <div className="cart-page__orderNotice cart-page__orderNotice--success">
                    <p>{orderSuccess}</p>
                    {orderReference ? <p>Referencia: {orderReference}</p> : null}
                    {receiptData ? (
                      <div className="cart-page__receiptActions">
                        <button type="button" onClick={() => downloadReceipt(receiptData)}>
                          Descargar albarán
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="cart-page__submitOrder"
                  disabled={
                    submittingOrder ||
                    (captchaEnabled &&
                      (!captchaReady || Boolean(captchaLoadError) || !captchaValidated))
                  }
                >
                  {submittingOrder ? "Enviando pedido..." : "Enviar pedido"}
                </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
