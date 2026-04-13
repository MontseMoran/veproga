function formatReceiptPrice(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
}

function escapeReceiptHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildReceiptHtml(receipt) {
  const itemsHtml = (receipt.items || [])
    .map((item) => {
      const details = [
        item.color ? `Color: ${escapeReceiptHtml(item.color)}` : "",
        item.size ? `Talla: ${escapeReceiptHtml(item.size)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;">
            <strong style="display:block;font-size:14px;line-height:1.45;">${escapeReceiptHtml(item.name)}</strong>
            ${details ? `<div style="margin-top:6px;color:#7b6f67;font-size:12px;">${details}</div>` : ""}
          </td>
          <td style="padding:18px 12px;border-bottom:1px solid #ece4de;text-align:center;">${escapeReceiptHtml(item.quantity)}</td>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;text-align:right;white-space:nowrap;">${escapeReceiptHtml(formatReceiptPrice(item.unit_price))}</td>
          <td style="padding:18px 20px;border-bottom:1px solid #ece4de;text-align:right;white-space:nowrap;font-weight:700;">${escapeReceiptHtml(formatReceiptPrice(item.line_total))}</td>
        </tr>
      `;
    })
    .join("");

  const delivery = receipt.delivery || {};
  const isPickup =
    delivery.method === "pickup" || String(delivery.address_line_1 || "").trim() === "Recogida en tienda";
  const deliveryLines = [
    isPickup ? "Recogida en tienda" : delivery.address_line_1,
    isPickup ? "" : delivery.address_line_2,
    isPickup ? "" : [delivery.postal_code, delivery.city].filter(Boolean).join(" "),
    isPickup ? "" : delivery.province,
  ]
    .filter(Boolean)
    .map((line) => `<div class="address-line">${escapeReceiptHtml(line)}</div>`)
    .join("");

  const customer = receipt.customer || {};
  const logoUrl = `${window.location.origin}/images/logo.png`;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Albarán ${escapeReceiptHtml(receipt.reference)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          @page { size: A4 portrait; margin: 12mm; }
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
          .footer-line {
            width: 100%;
            height: 1px;
            border: 0;
            margin: 0 0 14px;
            background: linear-gradient(90deg, rgba(45, 39, 34, 0), rgba(45, 39, 34, 0.22), rgba(45, 39, 34, 0));
          }
          .footer-note {
            margin: 0;
            text-align: center;
            font-size: 15px;
            line-height: 1.45;
            font-weight: 600;
            letter-spacing: 0.01em;
            color: rgba(45, 39, 34, 0.78);
          }
          @media print { body { background: #fff; } .sheet { border: 0; border-radius: 0; box-shadow: none; } }
          @media screen and (max-width: 640px) { .sheet { padding: 16px; } .hero, .info-grid, .order-summary, .hero-contact { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="sheet">
            <section class="hero">
              <div class="brand">
                <img class="brand-logo" src="${logoUrl}" alt="Bolboretas & Valu" />
                <div>
                  <p class="eyebrow">Bolboretas & Valu</p>
                  <h1>Albarán de pedido</h1>
                </div>
              </div>
              <div class="hero-customer">
                  <p class="hero-customer-name">${escapeReceiptHtml(customer.name)}</p>
                  <div class="hero-customer-address">${deliveryLines || '<div>-</div>'}</div>
                  <div class="hero-contact">
                    <div class="hero-contact-item">
                      <p class="meta-label">Correo</p>
                      <p class="meta-value">${escapeReceiptHtml(customer.email)}</p>
                    </div>
                    <div class="hero-contact-item">
                      <p class="meta-label">Teléfono</p>
                      <p class="meta-value">${escapeReceiptHtml(customer.phone)}</p>
                    </div>
                  </div>
                </div>
                <div class="hero-side">
                  <div class="hero-side-card"><p class="meta-label">Referencia</p><p class="meta-value">${escapeReceiptHtml(receipt.reference)}</p></div>
                  <div class="hero-side-card"><p class="meta-label">Fecha</p><p class="meta-value">${escapeReceiptHtml(receipt.created_at)}</p></div>
                  <div class="hero-side-card"><p class="meta-label">Forma de pago</p><p class="meta-value">${escapeReceiptHtml(receipt.payment_method_label)}</p></div>
                </div>
              </div>
            </section>
            <section class="content">
              ${
                ""
              }
              ${
                receipt.notes
                  ? `
                <section class="panel notes-panel">
                  <p class="panel-label">Indicaciones</p>
                  <h2>Notas del pedido</h2>
                  <p class="notes">${escapeReceiptHtml(receipt.notes).replaceAll("\n", "<br/>")}</p>
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
                  <p class="total-row"><span>Subtotal</span><strong>${escapeReceiptHtml(formatReceiptPrice(receipt.subtotal))}</strong></p>
                  ${
                    Number(receipt.discount_amount || 0) > 0
                      ? `<p class="total-row"><span>Descuento</span><strong>-${escapeReceiptHtml(formatReceiptPrice(receipt.discount_amount))}</strong></p>`
                      : ""
                  }
                  <p class="total-row"><span>${escapeReceiptHtml(receipt.shipping_label || "Envío")}</span><strong>${Number(receipt.shipping_amount || 0) > 0 ? escapeReceiptHtml(formatReceiptPrice(receipt.shipping_amount)) : "Gratis"}</strong></p>
                  <p class="total-row grand-total"><span>Total</span><strong>${escapeReceiptHtml(formatReceiptPrice(receipt.total))}</strong></p>
                </section>
              </section>
              <div class="footer-wrap">
                <hr class="footer-line" />
                <p class="footer-note">Gracias por apoyar al comercio local 🦋</p>
              </div>
            </section>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function downloadReceipt(receipt) {
  const html = buildReceiptHtml(receipt);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `albaran-${receipt.reference}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printReceipt(receipt) {
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
  iframeDocument.write(buildReceiptHtml(receipt));
  iframeDocument.close();
}
