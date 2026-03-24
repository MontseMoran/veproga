import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./cookieBanner.scss";

const CONSENT_KEY = "bolboretasvalu_cookie_notice_v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY) === "accepted";
    setVisible(!accepted);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite">
      <p className="cookie-banner__text">
        Usamos cookies técnicas para el funcionamiento de la web. Más info en{" "}
        <Link to="/privacidad">política de privacidad</Link>.
      </p>
      <button type="button" className="cookie-banner__btn" onClick={accept}>
        Entendido
      </button>
    </aside>
  );
}
