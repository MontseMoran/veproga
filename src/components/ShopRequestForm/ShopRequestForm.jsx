import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./ShopRequestForm.scss";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

const COPY = {
  title: "¿Necesitas otra talla o una prenda parecida?",
  intro: "Déjanos tu petición y revisamos disponibilidad para este producto.",
  open: "Abrir formulario",
  close: "Ocultar formulario",
  requestedItem: "Qué necesitas",
  requestedSize: "Talla",
  requestedSizePlaceholder: "Ej. S, 38, 6 años",
  name: "Nombre",
  email: "Correo electrónico",
  phone: "Teléfono",
  notes: "Notas",
  notesPlaceholder: "Color, tejido, estilo o cualquier detalle que te venga bien.",
  product: "Producto",
  category: "Categoría",
  success: "Petición enviada correctamente.",
  error: "No se pudo enviar la petición. Inténtalo de nuevo.",
  sending: "Enviando...",
  submit: "Enviar petición",
  captchaRequired: "Completa la verificación anti-spam para continuar.",
  captchaLoading: "Cargando verificación...",
  captchaLabel: "Verificación anti-spam",
  captchaLoadError:
    "No se pudo cargar la verificación anti-spam. Revisa bloqueadores, extensiones o prueba a recargar.",
  privacyPrefix: "He leído y acepto la ",
  privacyLink: "política de privacidad",
  privacyRequired: "Debes aceptar la política de privacidad para continuar.",
};

async function getFunctionErrorMessage(error, fallbackMessage) {
  const defaultMessage = fallbackMessage || COPY.error;

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

export default function ShopRequestForm({ product, categoryName, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedItem, setRequestedItem] = useState(product?.name || "");
  const [requestedSize, setRequestedSize] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(!TURNSTILE_SITE_KEY);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const turnstileContainerId = `shop-request-turnstile-${product?.id || "default"}`;
  const turnstileWidgetIdRef = useRef(null);
  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const captchaValidated = !captchaEnabled || Boolean(captchaToken);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !isOpen) return undefined;

    let cancelled = false;
    let loadTimeoutId = null;
    let readinessIntervalId = null;

    function renderTurnstile() {
      if (cancelled || !window.turnstile) return;

      const container = document.getElementById(turnstileContainerId);
      if (!container || container.dataset.rendered === "true") return;

      setCaptchaLoadError("");

      turnstileWidgetIdRef.current = window.turnstile.render(`#${turnstileContainerId}`, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        size: "flexible",
        appearance: "always",
        callback: (token) => setCaptchaToken(token || ""),
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => {
          setCaptchaToken("");
          setCaptchaLoadError(COPY.captchaLoadError);
        },
      });

      container.dataset.rendered = "true";
      setCaptchaReady(true);

      if (loadTimeoutId) {
        window.clearTimeout(loadTimeoutId);
      }
    }

    function handleScriptError() {
      setCaptchaReady(false);
      setCaptchaLoadError(COPY.captchaLoadError);
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
        renderTurnstile();
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

    return () => {
      cancelled = true;
      if (loadTimeoutId) {
        window.clearTimeout(loadTimeoutId);
      }
      if (readinessIntervalId) {
        window.clearInterval(readinessIntervalId);
      }
    };
  }, [isOpen, turnstileContainerId]);

  async function handleSubmit(event) {
    event.preventDefault();

    setSending(true);
    setOkMsg("");
    setErrMsg("");

    try {
      if (!supabase) {
        throw new Error("El cliente de Supabase no está configurado.");
      }

      if (captchaEnabled && !captchaToken) {
        throw new Error(COPY.captchaRequired);
      }

      const payload = {
        product_id: product?.id || null,
        product_name: product?.name || null,
        category_slug: product?.categories?.[0]?.slug || null,
        requested_item: requestedItem.trim(),
        requested_size: requestedSize.trim() || null,
        notes: notes.trim() || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        lang: "es",
      };

      const { error } = await supabase.functions.invoke("send-inquiry-email", {
        body: {
          mode: "shop_request",
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          product_id: payload.product_id,
          product_name: payload.product_name,
          category_slug: payload.category_slug,
          requested_item: payload.requested_item,
          requested_size: payload.requested_size,
          notes: payload.notes,
          captcha_token: captchaToken,
          message: [
            `${COPY.product}: ${product?.name || "-"}`,
            `${COPY.category}: ${categoryName || "-"}`,
            `${COPY.requestedItem}: ${payload.requested_item}`,
            `${COPY.requestedSize}: ${payload.requested_size || "-"}`,
            `${COPY.notes}: ${payload.notes || "-"}`,
          ].join("\n"),
          cat_name: product?.name || null,
          lang: payload.lang,
        },
      });

      if (error) throw error;

      setName("");
      setEmail("");
      setPhone("");
      setRequestedItem(product?.name || "");
      setRequestedSize("");
      setNotes("");
      setAcceptedPrivacy(false);
      setCaptchaToken("");
      setOkMsg(COPY.success);
      setIsOpen(true);
      onSuccess?.();

      if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetIdRef.current !== null) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } catch (error) {
      console.error("Error al enviar el formulario de solicitud:", error);
      setErrMsg(await getFunctionErrorMessage(error, COPY.error));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="shop-request">
      <button
        type="button"
        className="shop-request__toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="shop-request__header">
          <strong className="shop-request__title">{COPY.title}</strong>
          <span className="shop-request__intro">{COPY.intro}</span>
        </span>
        <span className="shop-request__toggleLabel">
          {isOpen ? COPY.close : COPY.open}
        </span>
      </button>

      <form
        className="shop-request__grid"
        onSubmit={handleSubmit}
        hidden={!isOpen}
      >
        <label className="shop-request__field">
          <span>{COPY.requestedItem}</span>
          <input
            value={requestedItem}
            onChange={(event) => setRequestedItem(event.target.value)}
            required
          />
        </label>

        <label className="shop-request__field">
          <span>{COPY.requestedSize}</span>
          <input
            value={requestedSize}
            onChange={(event) => setRequestedSize(event.target.value)}
            placeholder={COPY.requestedSizePlaceholder}
          />
        </label>

        <label className="shop-request__field">
          <span>{COPY.name}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label className="shop-request__field">
          <span>{COPY.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="shop-request__field">
          <span>{COPY.phone}</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>

        <label className="shop-request__field shop-request__field--full">
          <span>{COPY.notes}</span>
          <textarea
            rows="4"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={COPY.notesPlaceholder}
          />
        </label>

        <label className="shop-request__privacy shop-request__field--full">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(event) => setAcceptedPrivacy(event.target.checked)}
            onInvalid={(event) => event.target.setCustomValidity(COPY.privacyRequired)}
            onInput={(event) => event.target.setCustomValidity("")}
            required
          />
          <span>
            {COPY.privacyPrefix}
            <Link to="/privacidad">{COPY.privacyLink}</Link>.
          </span>
        </label>

        {captchaEnabled ? (
          <div className="shop-request__captcha shop-request__field--full">
            <span>{COPY.captchaLabel}</span>
            <div id={turnstileContainerId} />
            {captchaLoadError ? (
              <div className="shop-request__msg shop-request__msg--err">{captchaLoadError}</div>
            ) : null}
            {!captchaReady ? <div className="shop-request__msg">{COPY.captchaLoading}</div> : null}
            {captchaReady && !captchaLoadError && !captchaToken ? (
              <div className="shop-request__msg">{COPY.captchaRequired}</div>
            ) : null}
          </div>
        ) : null}

        {errMsg ? <div className="shop-request__msg shop-request__msg--err">{errMsg}</div> : null}
        {okMsg ? <div className="shop-request__msg shop-request__msg--ok">{okMsg}</div> : null}

        <button
          type="submit"
          className="shop-request__btn"
          disabled={
            sending || (captchaEnabled && (!captchaReady || Boolean(captchaLoadError) || !captchaValidated))
          }
        >
          {sending ? COPY.sending : COPY.submit}
        </button>
      </form>
    </section>
  );
}
