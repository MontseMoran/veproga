// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (name: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type InquiryPayload = {
  mode?: string;
  name?: string;
  email?: string;
  phone?: string;
  amount?: number | null;
  message?: string;
  inquiry_id?: string | null;
  created_at?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  category_slug?: string | null;
  requested_item?: string | null;
  requested_size?: string | null;
  notes?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getModeLabel(mode?: string) {
  const normalized = String(mode || "").toLowerCase();

  if (normalized === "shop_request") {
    return "Ha enviado una peticion de producto";
  }

  return "Ha enviado una consulta";
}

function buildSubject(payload: InquiryPayload) {
  const person = escapeHtml(payload.name || "Una persona");
  const modeLabel = getModeLabel(payload.mode);
  const productName = payload.product_name ? `: ${escapeHtml(payload.product_name)}` : "";
  return `Bolboretas & Valu: ${person} ${modeLabel}${productName}`;
}

function buildHtml(payload: InquiryPayload) {
  const person = escapeHtml(payload.name || "Una persona");
  const isShopRequest = String(payload.mode || "").toLowerCase() === "shop_request";
  const modeLabel = escapeHtml(getModeLabel(payload.mode));
  const productName = escapeHtml(payload.product_name || "-");
  const requestedItem = escapeHtml(payload.requested_item || "-");
  const requestedSize = escapeHtml(payload.requested_size || "-");
  const notes = escapeHtml(payload.notes || payload.message || "-").replaceAll("\n", "<br/>");

  if (isShopRequest) {
    return `
      <h2>Hola Bolboretas & Valu,</h2>
      <p><strong>${person}</strong> ${modeLabel}.</p>
      <hr />
      <p><strong>Nombre:</strong> ${person}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email || "-")}</p>
      <p><strong>Telefono:</strong> ${escapeHtml(payload.phone || "-")}</p>
      <p><strong>Producto:</strong> ${productName}</p>
      <p><strong>Que necesita:</strong> ${requestedItem}</p>
      <p><strong>Talla:</strong> ${requestedSize}</p>
      ${payload.category_slug ? `<p><strong>Categoria:</strong> ${escapeHtml(payload.category_slug)}</p>` : ""}
      ${payload.amount != null ? `<p><strong>Importe:</strong> ${escapeHtml(String(payload.amount))}</p>` : ""}
      <p><strong>Notas:</strong></p>
      <p>${notes}</p>
      ${(payload.created_at || payload.inquiry_id) ? `
        <hr />
        <p style="color:#666;font-size:12px;">
          Referencia interna${payload.created_at ? ` | Fecha: ${escapeHtml(payload.created_at)}` : ""}${payload.inquiry_id ? ` | ID: ${escapeHtml(payload.inquiry_id)}` : ""}
        </p>
      ` : ""}
    `;
  }

  return `
    <h2>Hola Bolboretas & Valu,</h2>
    <p><strong>${person}</strong> ${modeLabel}.</p>
    <hr />
    <p><strong>Nombre:</strong> ${person}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.email || "-")}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(payload.phone || "-")}</p>
    ${payload.amount != null ? `<p><strong>Importe:</strong> ${escapeHtml(String(payload.amount))}</p>` : ""}
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(payload.message || payload.notes || "-").replaceAll("\n", "<br/>")}</p>
    ${(payload.created_at || payload.inquiry_id) ? `
      <hr />
      <p style="color:#666;font-size:12px;">
        Referencia interna${payload.created_at ? ` | Fecha: ${escapeHtml(payload.created_at)}` : ""}${payload.inquiry_id ? ` | ID: ${escapeHtml(payload.inquiry_id)}` : ""}
      </p>
    ` : ""}
  `;
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
    const payload = (await req.json()) as InquiryPayload;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail =
      Deno.env.get("INQUIRY_SENDER_EMAIL") ||
      Deno.env.get("ORDER_SENDER_EMAIL") ||
      "onboarding@resend.dev";
    const recipientsRaw =
      Deno.env.get("INQUIRY_RECIPIENTS") ||
      Deno.env.get("ORDER_RECIPIENTS") ||
      "bolboretasvalu@gmail.com";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload?.name || !payload?.email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(payload.mode || "").toLowerCase() === "shop_request" && !payload?.requested_item) {
      return new Response(JSON.stringify({ error: "Missing required shop request fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = recipientsRaw
      .split(",")
      .map((email: string) => email.trim())
      .filter(Boolean);

    if (!recipients.length) {
      return new Response(JSON.stringify({ error: "No recipients configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: recipients,
        subject: buildSubject(payload),
        reply_to: payload.email || undefined,
        html: buildHtml(payload),
      }),
    });

    const resendData = await resendResp.json();

    if (!resendResp.ok) {
      return new Response(JSON.stringify({ error: "Resend error", details: resendData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, email_id: resendData?.id || null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
