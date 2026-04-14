// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value?: number | null) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
}

function paymentLabel(value?: string) {
  if (value === "bizum") return "Bizum";
  if (value === "transferencia") return "Transferencia";
  if (value === "tienda") return "Pago en tienda";
  return "No especificado";
}

const FREE_SHIPPING_THRESHOLD = 60;
const STANDARD_SHIPPING_EUR = 4.95;
const HEAVY_SHIPPING_EUR = 7.95;
const TURNSTILE_ENABLED = Deno.env.get("TURNSTILE_ENABLED") === "true";

function isHeavyShippingItem(item?: Record<string, unknown>) {
  return Boolean(item?.is_heavy_shipping);
}

function getShippingSummary(
  items: Array<Record<string, unknown>>,
  merchandiseTotal: number,
  deliveryMethod?: string
) {
  if (deliveryMethod === "pickup") {
    return {
      shippingAmount: 0,
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
    label: qualifiesForFreeShipping
      ? `Gratis desde ${formatPrice(FREE_SHIPPING_THRESHOLD)}`
      : hasHeavyItems
        ? "Envío ropa de cama pesada"
        : "Envío estándar",
  };
}

async function verifyTurnstileToken(token?: string, remoteIp?: string | null) {
  if (!TURNSTILE_ENABLED) {
    return { ok: true, enabled: false };
  }

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");

  if (!secret) {
    return { ok: false, enabled: true, error: "TURNSTILE_SECRET_KEY is missing" };
  }

  if (!token) {
    return { ok: false, enabled: true, error: "Missing CAPTCHA token" };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return { ok: false, enabled: true, error: "CAPTCHA verification failed" };
  }

  const data = await response.json();

  if (!data?.success) {
    return { ok: false, enabled: true, error: "Invalid CAPTCHA token" };
  }

  return { ok: true, enabled: true };
}

async function buildSequentialReference(supabase: ReturnType<typeof createClient>) {
  const year = new Date().getFullYear();
  const prefix = `BV-${year}-`;

  const { data: latestOrder, error } = await supabase
    .from("shop_orders")
    .select("reference")
    .ilike("reference", `${prefix}%`)
    .order("reference", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const lastNumber = latestOrder?.reference
    ? Number(String(latestOrder.reference).replace(prefix, ""))
    : 0;

  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function formatReceiptPrice(value?: number | null) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
}

function buildReceiptHtml(
  receipt: Record<string, unknown>,
  options: { introHtml?: string; siteUrl?: string | null } = {}
) {
  const itemsHtml = (Array.isArray(receipt.items) ? receipt.items : [])
    .map((item: Record<string, unknown>) => {
      const details = [
        item.color ? `Color: ${escapeHtml(String(item.color))}` : "",
        item.size ? `Talla: ${escapeHtml(String(item.size))}` : "",
      ]
        .filter(Boolean)
        .join(" &middot; ");

      return `
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;">
            <strong style="display:block;font-size:14px;line-height:1.45;">${escapeHtml(String(item.name || ""))}</strong>
            ${details ? `<div style="margin-top:6px;color:#7b6f67;font-size:12px;">${details}</div>` : ""}
          </td>
          <td style="padding:18px 12px;border-bottom:1px solid #ece4de;text-align:center;">${escapeHtml(String(item.quantity || 0))}</td>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;text-align:right;white-space:nowrap;">${escapeHtml(formatReceiptPrice(Number(item.unit_price || 0)))}</td>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;text-align:right;white-space:nowrap;font-weight:700;">${escapeHtml(formatReceiptPrice(Number(item.line_total || 0)))}</td>
        </tr>
      `;
    })
    .join("");

  const delivery = (receipt.delivery || {}) as Record<string, unknown>;
  const isPickup =
    delivery.method === "pickup" || String(delivery.address_line_1 || "").trim() === "Recogida en tienda";
  const deliveryLines = [
    isPickup ? "Recogida en tienda" : delivery.address_line_1,
    isPickup ? "" : delivery.address_line_2,
    isPickup ? "" : [delivery.postal_code, delivery.city].filter(Boolean).join(" "),
    isPickup ? "" : delivery.province,
  ]
    .filter(Boolean)
    .map((line) => `<div class="address-line">${escapeHtml(String(line))}</div>`)
    .join("");

  const customer = (receipt.customer || {}) as Record<string, unknown>;
  const normalizedSiteUrl = String(options.siteUrl || "").replace(/\/$/, "");
  const logoUrl = normalizedSiteUrl ? `${normalizedSiteUrl}/images/logo.png` : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Albaran ${escapeHtml(String(receipt.reference || ""))}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f6f1ea; color: #2d2722; font-family: Inter, Arial, sans-serif; }
          .page { width: 100%; max-width: 186mm; margin: 0 auto; padding: 0; }
          .sheet { background: #fffdfa; border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 14px; padding: 10mm 10mm 8mm; box-shadow: 0 12px 30px rgba(61, 44, 31, 0.06); }
          .hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(72mm, 1fr); gap: 10mm; align-items: start; padding-bottom: 5mm; border-bottom: 1px solid rgba(102, 76, 58, 0.12); break-inside: avoid; page-break-inside: avoid; }
          .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 4mm; grid-column: 1 / -1; }
          .brand-logo { width: 13mm; height: 13mm; object-fit: contain; }
          .eyebrow { margin: 0 0 1mm; font-size: 15px; line-height: 1.05; font-weight: 800; color: #2d2722; }
          h1 { margin: 0; font-size: 16px; line-height: 1.1; font-weight: 600; color: rgba(45, 39, 34, 0.7); }
          .hero-customer { min-width: 0; }
          .hero-customer-name { margin: 0; font-size: 18px; line-height: 1.05; font-weight: 800; text-transform: uppercase; color: #201915; }
          .hero-customer-address { margin: 2.5mm 0 0; font-size: 12px; line-height: 1.45; color: #4a3f37; }
          .hero-customer-address div + div { margin-top: 0.8mm; }
          .hero-contact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm 5mm; margin-top: 4mm; padding-top: 3.5mm; border-top: 1px solid rgba(102, 76, 58, 0.12); }
          .hero-contact-item { display: grid; gap: 1mm; min-width: 0; }
          .meta-label { margin: 0; font-size: 8px; line-height: 1.2; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(98, 79, 67, 0.62); }
          .meta-value { margin: 0; font-size: 11px; line-height: 1.35; font-weight: 600; color: #342823; overflow-wrap: anywhere; }
          .hero-side { display: grid; gap: 3mm; align-content: start; }
          .hero-side-card { display: grid; gap: 1mm; padding: 3.2mm 3.5mm; border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 10px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
          .hero-side-card .meta-value { font-size: 12px; font-weight: 800; }
          .content { display: grid; gap: 5mm; padding-top: 5mm; }
          .intro { padding: 3.5mm 4mm; border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 10px; background: #fffaf5; break-inside: avoid; page-break-inside: avoid; }
          .intro p { margin: 0; font-size: 11px; line-height: 1.45; color: #3e342d; }
          .intro p + p { margin-top: 2mm; }
          .info-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(58mm, 0.85fr); gap: 5mm; break-inside: avoid; page-break-inside: avoid; }
          .panel { padding: 4mm 4.2mm; border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 10px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
          .panel-label { margin: 0 0 1.4mm; font-size: 8px; line-height: 1.2; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(98, 79, 67, 0.62); }
          h2 { margin: 0 0 2mm; font-size: 14px; line-height: 1.15; color: #2d2722; }
          .stack { display: grid; gap: 2mm; }
          .row { display: grid; gap: 0.8mm; }
          .row strong { font-size: 8px; line-height: 1.2; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(98, 79, 67, 0.58); }
          .row span, .address-line, .notes { font-size: 11px; line-height: 1.45; color: #3e342d; }
          .notes-panel { break-inside: avoid; page-break-inside: avoid; }
          .notes { margin: 0; }
          .order-summary { display: grid; grid-template-columns: minmax(0, 1fr) 54mm; gap: 5mm; align-items: start; break-inside: avoid; page-break-inside: avoid; }
          .table-wrap { border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 10px; overflow: hidden; background: #fff; break-inside: avoid; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; }
          thead th { padding: 3mm 3.2mm; background: #f5eee7; font-size: 8px; line-height: 1.2; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(98, 79, 67, 0.65); }
          tbody td { padding: 3.2mm 3.2mm; font-size: 10.5px; line-height: 1.35; color: #3e342d; vertical-align: top; }
          tbody tr + tr td { border-top: 1px solid #ece4de; }
          .totals { padding: 3.5mm 4mm; border: 1px solid rgba(102, 76, 58, 0.1); border-radius: 10px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
          .total-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 0; font-size: 11px; line-height: 1.35; color: #4a4038; }
          .total-row + .total-row { margin-top: 2mm; }
          .grand-total { margin-top: 3mm; padding-top: 2.4mm; border-top: 1px solid rgba(102, 76, 58, 0.12); font-weight: 800; color: #2d2722; }
          .footer-wrap { margin-top: 4mm; padding-top: 2mm; break-inside: avoid; page-break-inside: avoid; }
          .footer-line { width: 100%; height: 1px; border: 0; margin: 0 0 14px; background: linear-gradient(90deg, rgba(45, 39, 34, 0), rgba(45, 39, 34, 0.22), rgba(45, 39, 34, 0)); }
          .footer-note { margin: 0; text-align: center; font-size: 15px; line-height: 1.45; font-weight: 600; letter-spacing: 0.01em; color: rgba(45, 39, 34, 0.78); }
          @media screen and (max-width: 640px) { .sheet { padding: 16px; } .hero, .info-grid, .order-summary, .hero-contact { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="sheet">
            <section class="hero">
              <div class="brand">
                ${logoUrl ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Bolboretas & Valu" />` : ""}
                <div>
                  <p class="eyebrow">Bolboretas & Valu</p>
                  <h1>Albaran de pedido</h1>
                </div>
              </div>
              <div class="hero-customer">
                <p class="hero-customer-name">${escapeHtml(String(customer.name || ""))}</p>
                <div class="hero-customer-address">${deliveryLines || '<div>-</div>'}</div>
                <div class="hero-contact">
                  <div class="hero-contact-item">
                    <p class="meta-label">Correo</p>
                    <p class="meta-value">${escapeHtml(String(customer.email || ""))}</p>
                  </div>
                  <div class="hero-contact-item">
                    <p class="meta-label">Telefono</p>
                    <p class="meta-value">${escapeHtml(String(customer.phone || ""))}</p>
                  </div>
                </div>
              </div>
              <div class="hero-side">
                <div class="hero-side-card"><p class="meta-label">Referencia</p><p class="meta-value">${escapeHtml(String(receipt.reference || ""))}</p></div>
                <div class="hero-side-card"><p class="meta-label">Fecha</p><p class="meta-value">${escapeHtml(String(receipt.created_at || ""))}</p></div>
                <div class="hero-side-card"><p class="meta-label">Forma de pago</p><p class="meta-value">${escapeHtml(String(receipt.payment_method_label || ""))}</p></div>
              </div>
            </section>
            <section class="content">
              ${options.introHtml ? `<section class="intro">${options.introHtml}</section>` : ""}
              ${
                ""
              }
              ${
                receipt.notes
                  ? `
                <section class="panel notes-panel">
                  <p class="panel-label">Indicaciones</p>
                  <h2>Notas del pedido</h2>
                  <p class="notes">${escapeHtml(String(receipt.notes)).replaceAll("\n", "<br/>")}</p>
                </section>
              `
                  : ""
              }
              <section class="order-summary">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="text-align:left;">Producto</th>
                        <th style="text-align:center;">Cant.</th>
                        <th style="text-align:right;">Precio</th>
                        <th style="text-align:right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>
                </div>
                <section class="totals">
                  <p class="total-row"><span>Subtotal</span><strong>${escapeHtml(formatReceiptPrice(Number(receipt.subtotal || 0)))}</strong></p>
                  ${
                    Number(receipt.discount_amount || 0) > 0
                      ? `<p class="total-row"><span>Descuento</span><strong>-${escapeHtml(formatReceiptPrice(Number(receipt.discount_amount || 0)))}</strong></p>`
                      : ""
                  }
                  <p class="total-row"><span>${escapeHtml(String(receipt.shipping_label || "Envio"))}</span><strong>${Number(receipt.shipping_amount || 0) > 0 ? escapeHtml(formatReceiptPrice(Number(receipt.shipping_amount || 0))) : "Gratis"}</strong></p>
                  <p class="total-row grand-total"><span>Total</span><strong>${escapeHtml(formatReceiptPrice(Number(receipt.total || 0)))}</strong></p>
                </section>
              </section>
              <div class="footer-wrap">
                <hr class="footer-line" />
                <p class="footer-note">
  Gracias por confiar en Bolboretas & Valu 🦋<br/>
  Cualquier duda, estamos aquí para ayudarte.
</p>
              </div>
            </section>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildInternalOrderEmailHtml(params: {
  payload: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  shippingSummary: { shippingAmount: number; label: string };
  finalTotal: number;
  reference: string;
}) {
  const { payload, items, shippingSummary, finalTotal, reference } = params;
  const customer = (payload.customer || {}) as Record<string, unknown>;
  const delivery = (payload.delivery || {}) as Record<string, unknown>;
  const isPickup =
    delivery.method === "pickup" || String(delivery.address_line_1 || "").trim() === "Recogida en tienda";

  const itemRows = items
    .map((item) => {
      const details = [
        item.color ? `Color: ${escapeHtml(String(item.color))}` : "",
        item.size ? `Talla: ${escapeHtml(String(item.size))}` : "",
        item.variant_sku ? `SKU variante: ${escapeHtml(String(item.variant_sku))}` : "",
      ]
        .filter(Boolean)
        .join(" &middot; ");

      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;">
            <strong>${escapeHtml(String(item.name || "-"))}</strong>
            ${details ? `<div style="color:#666;font-size:12px;margin-top:4px;">${details}</div>` : ""}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:center;">${escapeHtml(String(item.quantity || 0))}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:right;">${escapeHtml(formatPrice(Number(item.unit_price || 0)))}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:right;">${escapeHtml(formatPrice(Number(item.line_total || 0)))}</td>
        </tr>
      `;
    })
    .join("");

  const deliveryLines = [
    isPickup ? "Recogida en tienda" : delivery.address_line_1 || "",
    isPickup ? "" : delivery.address_line_2 || "",
    isPickup ? "" : [delivery.postal_code || "", delivery.city || ""].filter(Boolean).join(" "),
    isPickup ? "" : delivery.province || "",
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(String(line))}</div>`)
    .join("");

  const appliedDiscount = payload.applied_discount as Record<string, unknown> | undefined;
  const discountBlock = appliedDiscount
    ? `
      <p><strong>Cupon aplicado:</strong> ${escapeHtml(String(appliedDiscount.code || "-"))}</p>
      ${appliedDiscount.description ? `<p><strong>Descripcion:</strong> ${escapeHtml(String(appliedDiscount.description))}</p>` : ""}
    `
    : "";

  return `
    <h2>Nuevo pedido recibido</h2>
    <p><strong>Referencia:</strong> ${escapeHtml(reference)}</p>
    <p><strong>Fecha:</strong> ${escapeHtml(String(payload.created_at || new Date().toISOString()))}</p>
    <hr />
    <h3>Cliente</h3>
    <p><strong>Nombre:</strong> ${escapeHtml(String(customer.name || "-"))}</p>
    <p><strong>Email:</strong> ${escapeHtml(String(customer.email || "-"))}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(String(customer.phone || "-"))}</p>
    <hr />
    <h3>Entrega</h3>
    ${deliveryLines || "<p>-</p>"}
    <p><strong>Forma de pago:</strong> ${escapeHtml(paymentLabel(String(payload.payment_method || "")))}</p>
    ${payload.notes ? `<p><strong>Notas:</strong><br/>${escapeHtml(String(payload.notes)).replaceAll("\n", "<br/>")}</p>` : ""}
    <hr />
    <h3>Albaran</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:10px 8px;text-align:left;border-bottom:1px solid #d8cfca;">Producto</th>
          <th style="padding:10px 8px;text-align:center;border-bottom:1px solid #d8cfca;">Cant.</th>
          <th style="padding:10px 8px;text-align:right;border-bottom:1px solid #d8cfca;">Precio</th>
          <th style="padding:10px 8px;text-align:right;border-bottom:1px solid #d8cfca;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="margin-top:16px;">
      <p><strong>Subtotal:</strong> ${escapeHtml(formatPrice(Number(payload.subtotal || 0)))}</p>
      ${Number(payload.discount_amount || 0) > 0 ? `<p><strong>Descuento:</strong> -${escapeHtml(formatPrice(Number(payload.discount_amount || 0)))}</p>` : ""}
      ${discountBlock}
      <p><strong>${escapeHtml(shippingSummary.label)}:</strong> ${shippingSummary.shippingAmount > 0 ? escapeHtml(formatPrice(shippingSummary.shippingAmount)) : "Gratis"}</p>
      <p style="font-size:18px;"><strong>Total pedido:</strong> ${escapeHtml(formatPrice(finalTotal))}</p>
    </div>
  `;
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      reply_to: params.replyTo || undefined,
      html: params.html,
    }),
  });
}

async function readResponseBodySafe(response: Response) {
  try {
    return await response.clone().text();
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const forwardedFor = req.headers.get("x-forwarded-for");
    const remoteIp = forwardedFor?.split(",")[0]?.trim() || null;

    const captchaCheck = await verifyTurnstileToken(payload?.captcha_token, remoteIp);

    if (!captchaCheck.ok) {
      return new Response(JSON.stringify({ error: captchaCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload?.customer?.name || !payload?.customer?.email || !payload?.customer?.phone) {
      return new Response(JSON.stringify({ error: "Missing customer data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPickupOrder =
      payload?.delivery?.method === "pickup" ||
      String(payload?.delivery?.address_line_1 || "").trim() === "Recogida en tienda";

    if (
      !isPickupOrder &&
      (
        !payload?.delivery?.address_line_1 ||
        !payload?.delivery?.postal_code ||
        !payload?.delivery?.city ||
        !payload?.delivery?.province
      )
    ) {
      return new Response(JSON.stringify({ error: "Missing delivery data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!items.length) {
      return new Response(JSON.stringify({ error: "Missing order items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subtotal = Number(payload.subtotal || 0);
    const discountAmount = Number(payload.discount_amount || 0);
    const merchandiseTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
    const shippingSummary = getShippingSummary(items, merchandiseTotal, payload?.delivery?.method);
    const finalTotal = Number((merchandiseTotal + shippingSummary.shippingAmount).toFixed(2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let discountId = null;

    if (payload.applied_discount?.code) {
      const { data: discount, error: discountError } = await supabase
        .from("shop_discount_codes")
        .select("id, code, is_active, valid_from, valid_until, min_order_amount, usage_limit, times_used")
        .eq("code", payload.applied_discount.code)
        .maybeSingle();

      if (discountError) {
        return new Response(JSON.stringify({ error: discountError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!discount || !discount.is_active) {
        return new Response(JSON.stringify({ error: "Discount code is not active" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = Date.now();
      const validFrom = discount.valid_from ? new Date(discount.valid_from).getTime() : null;
      const validUntil = discount.valid_until ? new Date(discount.valid_until).getTime() : null;
      const minOrderAmount = Number(discount.min_order_amount || 0);

      if (validFrom && Number.isFinite(validFrom) && now < validFrom) {
        return new Response(JSON.stringify({ error: "Discount code not available yet" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (validUntil && Number.isFinite(validUntil) && now > validUntil) {
        return new Response(JSON.stringify({ error: "Discount code expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (Number(payload.subtotal || 0) < minOrderAmount) {
        return new Response(JSON.stringify({ error: "Minimum order amount not met" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        discount.usage_limit &&
        Number(discount.usage_limit) > 0 &&
        Number(discount.times_used || 0) >= Number(discount.usage_limit)
      ) {
        return new Response(JSON.stringify({ error: "Discount code exhausted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      discountId = discount.id;
    }

    const orderReference = await buildSequentialReference(supabase);

    const orderInsert = {
      customer_name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
      payment_method: payload.payment_method,
      total_eur: finalTotal,
      reference: orderReference,
      address_line_1: isPickupOrder ? "Recogida en tienda" : payload.delivery.address_line_1,
      address_line_2: isPickupOrder ? "Pago en tienda" : payload.delivery.address_line_2 || null,
      postal_code: isPickupOrder ? "RECOGIDA" : payload.delivery.postal_code,
      city: isPickupOrder ? "Recogida en tienda" : payload.delivery.city,
      province: isPickupOrder ? "Recogida en tienda" : payload.delivery.province,
      notes: payload.notes || null,
      subtotal_eur: subtotal,
      discount_eur: discountAmount,
      discount_code: payload.applied_discount?.code || null,
      status: "pendiente",
    };

    const { data: createdOrder, error: orderError } = await supabase
      .from("shop_orders")
      .insert([orderInsert])
      .select("id, reference")
      .single();

    if (orderError) {
      return new Response(JSON.stringify({ error: orderError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderItems = items.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id || null,
      variant_id: item.variant_id || null,
      quantity: Number(item.quantity || 0),
      price_eur: Number(item.unit_price || 0),
    }));

    let { error: itemsError } = await supabase
      .from("shop_order_items")
      .insert(orderItems);

    const variantConstraintFailed = String(itemsError?.message || "").includes(
      "shop_order_items_variant_id_fkey"
    );

    if (variantConstraintFailed) {
      const fallbackOrderItems = orderItems.map((item) => ({
        ...item,
        variant_id: null,
      }));

      const fallbackInsert = await supabase
        .from("shop_order_items")
        .insert(fallbackOrderItems);

      itemsError = fallbackInsert.error;
    }

    if (itemsError) {
      await supabase.from("shop_orders").delete().eq("id", createdOrder.id);

      return new Response(JSON.stringify({ error: itemsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (discountId) {
      const { error: discountUpdateError } = await supabase.rpc("increment_discount_times_used", {
        discount_id: discountId,
      });

      if (discountUpdateError) {
        const { data: currentDiscount } = await supabase
          .from("shop_discount_codes")
          .select("times_used")
          .eq("id", discountId)
          .single();

        const nextTimesUsed = Number(currentDiscount?.times_used || 0) + 1;

        const { error: fallbackDiscountError } = await supabase
          .from("shop_discount_codes")
          .update({ times_used: nextTimesUsed })
          .eq("id", discountId);

        if (fallbackDiscountError) {
          return new Response(JSON.stringify({ error: fallbackDiscountError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail =
      Deno.env.get("ORDER_SENDER_EMAIL") ||
      Deno.env.get("INQUIRY_SENDER_EMAIL") ||
      "onboarding@resend.dev";
    const recipientsRaw =
      Deno.env.get("ORDER_RECIPIENTS") ||
      Deno.env.get("INQUIRY_RECIPIENTS") ||
      "bolboretasvalu@gmail.com";
    const siteUrl =
      Deno.env.get("SITE_URL") ||
      Deno.env.get("PUBLIC_SITE_URL") ||
      Deno.env.get("APP_URL") ||
      null;

    let emailWarning = null;

    if (resendApiKey && false) {
      const recipients = recipientsRaw
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      const itemRows = items
        .map((item) => {
          const details = [
            item.color ? `Color: ${escapeHtml(String(item.color))}` : "",
            item.size ? `Talla: ${escapeHtml(String(item.size))}` : "",
            item.variant_sku ? `SKU variante: ${escapeHtml(String(item.variant_sku))}` : "",
          ]
            .filter(Boolean)
            .join(" · ");

          return `
            <tr>
              <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;">
                <strong>${escapeHtml(item.name || "-")}</strong>
                ${details ? `<div style="color:#666;font-size:12px;margin-top:4px;">${details}</div>` : ""}
              </td>
              <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:center;">${escapeHtml(String(item.quantity || 0))}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:right;">${escapeHtml(formatPrice(item.unit_price))}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #ece7e4;text-align:right;">${escapeHtml(formatPrice(item.line_total))}</td>
            </tr>
          `;
        })
        .join("");

      const deliveryLines = [
        isPickupOrder ? "Recogida en tienda" : payload.delivery.address_line_1 || "",
        isPickupOrder ? "" : payload.delivery.address_line_2 || "",
        isPickupOrder
          ? ""
          : [payload.delivery.postal_code || "", payload.delivery.city || ""].filter(Boolean).join(" "),
        isPickupOrder ? "" : payload.delivery.province || "",
      ]
        .filter(Boolean)
        .map((line) => `<div>${escapeHtml(line)}</div>`)
        .join("");

      const discountBlock = payload.applied_discount
        ? `
          <p><strong>Cupón aplicado:</strong> ${escapeHtml(payload.applied_discount.code || "-")}</p>
          ${payload.applied_discount.description ? `<p><strong>Descripción:</strong> ${escapeHtml(payload.applied_discount.description)}</p>` : ""}
        `
        : "";

      const html = `
        <h2>Nuevo pedido recibido</h2>
        <p><strong>Referencia:</strong> ${escapeHtml(createdOrder.reference || orderReference)}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(payload.created_at || new Date().toISOString())}</p>
        <hr />
        <h3>Cliente</h3>
        <p><strong>Nombre:</strong> ${escapeHtml(payload.customer.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.customer.email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(payload.customer.phone)}</p>
        <hr />
        <h3>Entrega</h3>
        ${deliveryLines || "<p>-</p>"}
        <p><strong>Forma de pago:</strong> ${escapeHtml(paymentLabel(payload.payment_method))}</p>
        ${payload.notes ? `<p><strong>Notas:</strong><br/>${escapeHtml(payload.notes).replaceAll("\n", "<br/>")}</p>` : ""}
        <hr />
        <h3>Albarán</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:10px 8px;text-align:left;border-bottom:1px solid #d8cfca;">Producto</th>
              <th style="padding:10px 8px;text-align:center;border-bottom:1px solid #d8cfca;">Cant.</th>
              <th style="padding:10px 8px;text-align:right;border-bottom:1px solid #d8cfca;">Precio</th>
              <th style="padding:10px 8px;text-align:right;border-bottom:1px solid #d8cfca;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:16px;">
          <p><strong>Subtotal:</strong> ${escapeHtml(formatPrice(payload.subtotal))}</p>
          ${Number(payload.discount_amount || 0) > 0 ? `<p><strong>Descuento:</strong> -${escapeHtml(formatPrice(payload.discount_amount))}</p>` : ""}
          ${discountBlock}
          <p><strong>${escapeHtml(shippingSummary.label)}:</strong> ${shippingSummary.shippingAmount > 0 ? escapeHtml(formatPrice(shippingSummary.shippingAmount)) : "Gratis"}</p>
          <p style="font-size:18px;"><strong>Total pedido:</strong> ${escapeHtml(formatPrice(finalTotal))}</p>
        </div>
      `;

      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: recipients,
          subject: `Bolboretas & Valu: nuevo pedido ${escapeHtml(createdOrder.reference || orderReference)}`,
          reply_to: payload.customer.email || undefined,
          html,
        }),
      });

      if (!resendResp.ok) {
        emailWarning = "Pedido guardado, pero no se pudo enviar el correo del albarán.";
      }
    } else {
      emailWarning = "Pedido guardado, pero falta RESEND_API_KEY para enviar el albarán.";
    }

    if (resendApiKey) {
      const recipients = recipientsRaw
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const reference = createdOrder.reference || orderReference;
      const receipt = {
        reference,
        created_at: payload.created_at || new Date().toISOString(),
        customer: payload.customer,
        delivery: payload.delivery,
        payment_method: payload.payment_method,
        payment_method_label: paymentLabel(payload.payment_method),
        notes: payload.notes,
        items: items.map((item) => ({
          name: item.name,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        })),
        subtotal,
        discount_amount: discountAmount,
        shipping_amount: shippingSummary.shippingAmount,
        shipping_label: shippingSummary.label,
        total: finalTotal,
      };

      const internalHtml = buildInternalOrderEmailHtml({
        payload,
        items,
        shippingSummary,
        finalTotal,
        reference,
      });

     const customerIntroHtml = `
  <p>Hola ${escapeHtml(String(payload.customer?.name || ""))},</p>

  <p>¡Gracias por tu pedido en <strong>Bolboretas & Valu</strong>! 💛</p>

  <p>Hemos recibido tu pedido correctamente y ya lo estamos preparando.</p>

  ${
    payload?.delivery?.method === "pickup"
      ? `<p>Podrás recogerlo en tienda en breve. Te avisaremos cuando esté listo.</p>`
      : `<p>Lo enviaremos lo antes posible a la dirección indicada.</p>`
  }

  <p><strong>Referencia del pedido:</strong> ${escapeHtml(reference)}</p>

  <p>Debajo tienes el resumen completo de tu compra.</p>
`;
      const customerHtml = buildReceiptHtml(receipt, {
        introHtml: customerIntroHtml,
        siteUrl,
      });

      const emailErrors = [];

      const internalResp = await sendResendEmail({
        apiKey: resendApiKey,
        from: senderEmail,
        to: recipients,
        subject: `Bolboretas & Valu: nuevo pedido ${reference}`,
        replyTo: payload.customer.email || undefined,
        html: internalHtml,
      });

      const internalBody = await readResponseBodySafe(internalResp);
      console.log(
        JSON.stringify({
          scope: "submit-order",
          step: "send-internal-email",
          ok: internalResp.ok,
          status: internalResp.status,
          reference,
          recipients,
          body: internalBody,
        })
      );

      if (!internalResp.ok) {
        emailErrors.push("aviso interno");
      }

      const customerEmail = String(payload.customer?.email || "").trim();

      if (customerEmail) {
        const customerResp = await sendResendEmail({
          apiKey: resendApiKey,
          from: senderEmail,
          to: [customerEmail],
          subject: `Bolboretas & Valu: tu albaran ${reference}`,
          html: customerHtml,
        });

        const customerBody = await readResponseBodySafe(customerResp);
        console.log(
          JSON.stringify({
            scope: "submit-order",
            step: "send-customer-email",
            ok: customerResp.ok,
            status: customerResp.status,
            reference,
            customerEmail,
            body: customerBody,
          })
        );

        if (!customerResp.ok) {
          emailErrors.push("albaran al cliente");
        }
      } else {
        console.log(
          JSON.stringify({
            scope: "submit-order",
            step: "skip-customer-email",
            ok: false,
            reference,
            reason: "missing customer email",
          })
        );
      }

      emailWarning = emailErrors.length
        ? `Pedido guardado, pero no se pudo enviar: ${emailErrors.join(", ")}.`
        : null;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: createdOrder.id,
        reference: createdOrder.reference || orderReference,
        warning: emailWarning,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
