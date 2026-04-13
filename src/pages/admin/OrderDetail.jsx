import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { printReceipt } from "../../lib/orderReceipt";
import { supabase } from "../../lib/supabaseClient";

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function paymentLabel(value) {
  if (value === "bizum") return "Bizum";
  if (value === "transferencia") return "Transferencia";
  if (value === "tienda") return "Pago en tienda";
  return value || "No especificado";
}

function buildAdminReceipt(order, items, subtotal) {
  const isPickup = String(order?.address_line_1 || "").trim() === "Recogida en tienda";
  const shippingAmount = Math.max(
    0,
    Number((Number(order?.total_eur || 0) - subtotal + Number(order?.discount_eur || 0)).toFixed(2))
  );

  return {
    reference: order?.reference || "-",
    created_at: formatDate(order?.created_at),
    payment_method_label: paymentLabel(order?.payment_method),
    customer: {
      name: order?.customer_name || "-",
      email: order?.email || "-",
      phone: order?.phone || "-",
    },
    delivery: {
      address_line_1: order?.address_line_1 || "",
      address_line_2: order?.address_line_2 || "",
      postal_code: order?.postal_code || "",
      city: order?.city || "",
      province: order?.province || "",
    },
    notes: order?.notes || "",
    items: items.map((item) => ({
      name: item.shop_products?.name || "Producto",
      color: item.shop_product_variants?.color || "",
      size: item.shop_product_variants?.size || "",
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.price_eur || 0),
      line_total: Number(item.price_eur || 0) * Number(item.quantity || 0),
    })),
    subtotal,
    discount_amount: Number(order?.discount_eur || 0),
    shipping_amount: shippingAmount,
    shipping_label: isPickup ? "Recogida en tienda" : shippingAmount > 0 ? "Envío" : "Gratis",
    total: Number(order?.total_eur || 0),
  };
}

function buildShippingLabelHtml(order) {
  if (String(order?.address_line_1 || "").trim() === "Recogida en tienda") {
    return "";
  }

  const addressLines = [
    order.address_line_1,
    order.address_line_2,
    [order.postal_code, order.city].filter(Boolean).join(" "),
    order.province,
  ].filter(Boolean);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Etiqueta ${order.reference || ""}</title>
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            min-height: 297mm;
            background: #f3efe9;
            color: #1f1713;
            font-family: "Segoe UI", Arial, sans-serif;
          }
          body { display: block; }
          .page {
            width: 210mm;
            height: 148.5mm;
            overflow: hidden;
            padding: 8mm;
          }
          .label {
            width: 100%;
            height: 100%;
            padding: 10mm;
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: 7mm;
            background: linear-gradient(180deg, #fffdfa 0%, #fff 100%);
            border: 0.5mm solid #d8cec4;
            box-shadow: inset 0 0 0 0.6mm rgba(255, 255, 255, 0.75);
            position: relative;
          }
          .topbar {
            display: flex;
            align-items: start;
            justify-content: space-between;
            gap: 10mm;
            padding-bottom: 5mm;
            border-bottom: 0.45mm solid #d9cec2;
          }
          .brand {
            margin: 0;
            font-size: 8pt;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #9a7f6d;
          }
          .ref {
            margin: 0;
            font-size: 11pt;
            font-weight: 700;
            letter-spacing: 0.02em;
            color: #2b211c;
            text-align: right;
          }
          .main {
            display: grid;
            align-content: center;
            gap: 5mm;
          }
          .recipient {
            padding: 7mm 8mm;
            background: #fff;
            border: 0.45mm solid #e4d9ce;
          }
          .recipient-label {
            margin: 0 0 3mm;
            font-size: 8pt;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #a08572;
          }
          .name {
            margin: 0;
            font-size: 22pt;
            font-weight: 800;
            line-height: 1.02;
            text-transform: uppercase;
            max-width: 150mm;
          }
          .address {
            margin: 0;
            font-size: 14.5pt;
            line-height: 1.4;
            color: #342823;
            max-width: 132mm;
          }
          .address div + div { margin-top: 1.8mm; }
          .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8mm;
            padding-top: 5mm;
            border-top: 0.45mm solid #d9cec2;
          }
          .phone {
            margin: 0;
            font-size: 12pt;
            font-weight: 800;
            letter-spacing: 0.01em;
          }
          .phone-label {
            color: #8b7262;
            font-weight: 600;
          }
          .meta {
            margin: 0;
            font-size: 8.5pt;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #9a7f6d;
            text-align: right;
          }
          @page { size: A4 portrait; margin: 0; }
        </style>
      </head>
      <body>
        <div class="page">
          <section class="label">
          <div class="topbar">
            <p class="brand">Bolboretas & Valu</p>
            <p class="ref">Pedido ${order.reference || "-"}</p>
          </div>

          <div class="main">
            <div class="recipient">
              <p class="recipient-label">Destinataria</p>
              <p class="name">${order.customer_name || "-"}</p>
              <div class="address">
                ${addressLines.map((line) => `<div>${line}</div>`).join("")}
              </div>
            </div>
          </div>

          <div class="footer">
            <p class="phone"><span class="phone-label">Tel.</span> ${order.phone || "-"}</p>
            <p class="meta">Etiqueta de envío</p>
          </div>
          </section>
        </div>
      </body>
    </html>
  `;
}

function printShippingLabel(order) {
  if (String(order?.address_line_1 || "").trim() === "Recogida en tienda") {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  iframe.onload = () => {
    const iframeWindow = iframe.contentWindow;

    if (!iframeWindow) {
      cleanup();
      return;
    }

    iframeWindow.focus();
    window.setTimeout(() => {
      iframeWindow.print();
      cleanup();
    }, 150);
  };

  document.body.appendChild(iframe);

  const iframeDocument = iframe.contentDocument;

  if (!iframeDocument) {
    cleanup();
    return;
  }

  iframeDocument.open();
  iframeDocument.write(buildShippingLabelHtml(order));
  iframeDocument.close();
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [status, setStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase.functions.invoke("admin-orders", {
          body: {
            action: "detail",
            id,
          },
        });

        if (error) throw error;

        if (!active) return;

        setOrder(data?.order || null);
        setStatus(data?.order?.status || "pendiente");
        setItems(data?.items || []);
      } catch (error) {
        console.error("Error al cargar el pedido:", error);
        if (active) {
          setOrder(null);
          setItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price_eur || 0) * Number(item.quantity || 0), 0),
    [items]
  );
  const shippingAmount = useMemo(
    () =>
      Math.max(
        0,
        Number((Number(order?.total_eur || 0) - subtotal + Number(order?.discount_eur || 0)).toFixed(2))
      ),
    [order?.discount_eur, order?.total_eur, subtotal]
  );
  const receipt = useMemo(() => buildAdminReceipt(order, items, subtotal), [order, items, subtotal]);
  const isPickupOrder = String(order?.address_line_1 || "").trim() === "Recogida en tienda";

  async function handleSaveStatus() {
    if (!order) return;

    setSavingStatus(true);
    setStatusMessage("");

    try {
      const { error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "update-status",
          id: order.id,
          status,
        },
      });

      if (error) throw error;

      setOrder((current) => (current ? { ...current, status } : current));
      setStatusMessage("Estado actualizado.");
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      setStatusMessage("No se pudo actualizar el estado.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return <p>Cargando pedido...</p>;
  }

  if (!order) {
    return (
      <div className="admin-orderDetail">
        <p>Pedido no encontrado.</p>
        <Link to="/admin/pedidos" className="admin-action admin-action--ghost">
          Volver a pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-orderDetail">
      <div className="admin-pageHeader">
        <div>
          <Link to="/admin/pedidos" className="admin-orderDetail__back">
            Volver a pedidos
          </Link>
          <h2>{order.reference}</h2>
          <p>{formatDate(order.created_at)}</p>
        </div>

        <div className="admin-top-actions">
          <button
            type="button"
            className="admin-action admin-action--ghost"
            onClick={() => printReceipt(receipt)}
          >
            Imprimir albarán
          </button>
          <button
            type="button"
            className="admin-action admin-action--ghost"
            onClick={() => printShippingLabel(order)}
            disabled={isPickupOrder}
          >
            Imprimir etiqueta
          </button>
        </div>
      </div>

      <div className="admin-orderDetail__layout">
        <section className="admin-orderPanel">
          <div className="admin-orderPanel__header">
            <h3>Estado y resumen</h3>
          </div>

          <div className="admin-orderStatus">
            <label htmlFor="order-status">Estado</label>
            <div className="admin-orderStatus__row">
              <select
                id="order-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="admin-action admin-action--primary"
                onClick={handleSaveStatus}
                disabled={savingStatus}
              >
                {savingStatus ? "Guardando..." : "Guardar estado"}
              </button>
            </div>
            {statusMessage ? <p className="admin-orderStatus__msg">{statusMessage}</p> : null}
          </div>

          <div className="admin-orderSummary">
            <div>
              <strong>Pago</strong>
              <p>{paymentLabel(order.payment_method)}</p>
            </div>
            <div>
              <strong>Subtotal líneas</strong>
              <p>{formatPrice(subtotal)}</p>
            </div>
            <div>
              <strong>Descuento</strong>
              <p>{formatPrice(order.discount_eur)}</p>
            </div>
            <div>
              <strong>Envío</strong>
              <p>{isPickupOrder ? "Recogida en tienda" : shippingAmount > 0 ? formatPrice(shippingAmount) : "Gratis"}</p>
            </div>
            <div>
              <strong>Total</strong>
              <p>{formatPrice(order.total_eur)}</p>
            </div>
          </div>
        </section>

        <section className="admin-orderPanel">
          <div className="admin-orderPanel__header">
            <h3>Cliente y entrega</h3>
          </div>

          <div className="admin-orderInfoGrid">
            <div>
              <strong>Cliente</strong>
              <p>{order.customer_name || "-"}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p>{order.email || "-"}</p>
            </div>
            <div>
              <strong>Teléfono</strong>
              <p>{order.phone || "-"}</p>
            </div>
            <div className="admin-orderInfoGrid__full">
              <strong>{isPickupOrder ? "Entrega" : "Dirección"}</strong>
              <p>{order.address_line_1 || "-"}</p>
              {!isPickupOrder && order.address_line_2 ? <p>{order.address_line_2}</p> : null}
              {!isPickupOrder ? <p>{[order.postal_code, order.city].filter(Boolean).join(" ")}</p> : null}
              {!isPickupOrder ? <p>{order.province || "-"}</p> : null}
            </div>
            {order.notes ? (
              <div className="admin-orderInfoGrid__full">
                <strong>Notas</strong>
                <p>{order.notes}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="admin-orderPanel">
        <div className="admin-orderPanel__header">
          <h3>Líneas del pedido</h3>
        </div>

        <div className="admin-orderItems">
          {items.map((item) => {
            const product = item.shop_products || {};
            const variant = item.shop_product_variants || {};
            const lineTotal = Number(item.price_eur || 0) * Number(item.quantity || 0);

            return (
              <article key={item.id} className="admin-orderItem">
                <div>
                  <strong>{product.name || "Producto"}</strong>
                  <p>SKU producto: {product.sku || "-"}</p>
                  {(variant.color || variant.size || variant.sku) ? (
                    <p>
                      {variant.color ? `Color: ${variant.color}` : ""}
                      {variant.color && variant.size ? " · " : ""}
                      {variant.size ? `Talla: ${variant.size}` : ""}
                      {(variant.color || variant.size) && variant.sku ? " · " : ""}
                      {variant.sku ? `SKU variante: ${variant.sku}` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="admin-orderItem__meta">
                  <p>Cant.: {item.quantity}</p>
                  <p>Precio: {formatPrice(item.price_eur)}</p>
                  <p>Total: {formatPrice(lineTotal)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
