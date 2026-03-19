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
  cat_id?: string | null;
  cat_name?: string | null;
  lang?: string;
  inquiry_id?: string | null;
  created_at?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getModeLabel(mode?: string, lang?: string) {
  const isCat = String(lang || "").toLowerCase().startsWith("cat");
  const normalized = String(mode || "").toLowerCase();

  if (isCat) {
    if (normalized === "adoption") return "adoptar";
    if (normalized === "sponsor") return "amadrinar";
    if (normalized === "member") return "fer-se soci";
    if (normalized === "volunteer") return "fer voluntariat";
    if (normalized === "donation") return "fer una donacio";
    if (normalized === "shop_request") return "demanar un producte de botiga";
    return "enviar una sollicitud";
  }

  if (normalized === "adoption") return "adoptar";
  if (normalized === "sponsor") return "amadrinar";
  if (normalized === "member") return "hacerse socio";
  if (normalized === "volunteer") return "hacer voluntariado";
  if (normalized === "donation") return "hacer una donacion";
  if (normalized === "shop_request") return "pedir un producto de tienda";
  return "enviar una solicitud";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const payload = (await req.json()) as InquiryPayload;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("INQUIRY_SENDER_EMAIL") || "onboarding@resend.dev";
    const recipientsRaw = Deno.env.get("INQUIRY_RECIPIENTS") ||
      "webbolboretasvalu@gmai.com,sos.maullidos@gmail.com";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY secret" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const recipients = recipientsRaw
      .split(",")
      .map((email: string) => email.trim())
      .filter(Boolean);

    if (!recipients.length) {
      return new Response(
        JSON.stringify({ error: "No recipients configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const modeLabel = getModeLabel(payload.mode, payload.lang);
    const person = escapeHtml(payload.name || "Una persona");
    const catName = escapeHtml(payload.cat_name || "un gato");
    const subject = `Bolboretas & Valu: ${person} quiere ${modeLabel}`;

    const html = `
      <h2>Hola Bolboretas & Valu,</h2>
      <p><strong>${person}</strong> quiere <strong>${escapeHtml(modeLabel)}</strong>${payload.cat_name ? ` a <strong>${catName}</strong>` : ""}.</p>
      <hr />
      <p><strong>Nombre:</strong> ${person}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email || "-")}</p>
      <p><strong>Telefono:</strong> ${escapeHtml(payload.phone || "-")}</p>
      <p><strong>Gato:</strong> ${catName}</p>
      ${payload.amount != null ? `<p><strong>Importe:</strong> ${escapeHtml(String(payload.amount))}</p>` : ""}
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(payload.message || "-").replaceAll("\n", "<br/>")}</p>
      ${(payload.created_at || payload.inquiry_id) ? `
        <hr />
        <p style="color:#666;font-size:12px;">
          Referencia interna${payload.created_at ? ` | Fecha: ${escapeHtml(payload.created_at)}` : ""}${payload.inquiry_id ? ` | ID: ${escapeHtml(payload.inquiry_id)}` : ""}
        </p>
      ` : ""}
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
        subject,
        html,
      }),
    });

    const resendData = await resendResp.json();
    if (!resendResp.ok) {
      return new Response(
        JSON.stringify({ error: "Resend error", details: resendData }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, email_id: resendData?.id || null }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

