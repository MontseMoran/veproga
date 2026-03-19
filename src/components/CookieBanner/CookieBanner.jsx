import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./cookieBanner.scss";

const CONSENT_KEY = "bolboretasvalu_cookie_notice_v1";

export default function CookieBanner() {
  const { i18n } = useTranslation();
  const isCat = i18n.language?.startsWith("cat");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY) === "accepted";
    setVisible(!accepted);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite">
      <p className="cookie-banner__text">
        {isCat
          ? "Utilitzem cookies tÃ¨cniques per al funcionament del web. MÃ©s info a"
          : "Usamos cookies tÃ©cnicas para el funcionamiento de la web. MÃ¡s info en"}{" "}
        <Link to="/privacidad">{isCat ? "polÃ­tica de privacitat" : "polÃ­tica de privacidad"}</Link>.
      </p>
      <button type="button" className="cookie-banner__btn" onClick={accept}>
        {isCat ? "EntÃ¨s" : "Entendido"}
      </button>
    </aside>
  );
}

