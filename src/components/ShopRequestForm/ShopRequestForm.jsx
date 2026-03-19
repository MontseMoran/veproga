import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./ShopRequestForm.scss";

const COPY = {
  title: "¿Necesitas otra talla o una prenda parecida?",
  intro: "Déjanos tu petición y revisamos disponibilidad para este producto.",
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
  emailWarning: "La petición se guardó, pero no se pudo enviar el aviso por correo.",
  sending: "Enviando...",
  submit: "Enviar petición",
  privacyPrefix: "He leído y acepto la ",
  privacyLink: "política de privacidad",
  privacyRequired: "Debes aceptar la política de privacidad para continuar.",
};

export default function ShopRequestForm({ product, categoryName, onSuccess }) {
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
  const [warnMsg, setWarnMsg] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setSending(true);
    setOkMsg("");
    setErrMsg("");
    setWarnMsg("");

    try {
      if (!supabase) {
        throw new Error("Supabase client not configured");
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

      const { error } = await supabase.from("shop_requests").insert([payload]);
      if (error) throw error;

      const { error: notifyError } = await supabase.functions.invoke("send-inquiry-email", {
        body: {
          mode: "shop_request",
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
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

      if (notifyError) {
        setWarnMsg(COPY.emailWarning);
      }

      setName("");
      setEmail("");
      setPhone("");
      setRequestedItem(product?.name || "");
      setRequestedSize("");
      setNotes("");
      setAcceptedPrivacy(false);
      setOkMsg(COPY.success);
      onSuccess?.();
    } catch (error) {
      console.error("ShopRequestForm submit error:", error);
      setErrMsg(COPY.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="shop-request">
      <h3 className="shop-request__title">{COPY.title}</h3>
      <p className="shop-request__intro">{COPY.intro}</p>

      <form className="shop-request__grid" onSubmit={handleSubmit}>
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

        {errMsg ? <div className="shop-request__msg shop-request__msg--err">{errMsg}</div> : null}
        {okMsg ? <div className="shop-request__msg shop-request__msg--ok">{okMsg}</div> : null}
        {warnMsg ? <div className="shop-request__msg shop-request__msg--warn">{warnMsg}</div> : null}

        <button type="submit" className="shop-request__btn" disabled={sending}>
          {sending ? COPY.sending : COPY.submit}
        </button>
      </form>
    </section>
  );
}
