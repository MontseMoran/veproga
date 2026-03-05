import React from "react";
import { useTranslation } from "react-i18next";
import "./footer.scss";

export default function Footer() {
  const { t } = useTranslation();
  const { t: tHome } = useTranslation("home");

  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="left">
          <div className="brand-small">{t("brand")}</div>

          <div className="contact-small">
            <a href="mailto:sos.maullidos@gmail.com">
              sos.maullidos@gmail.com
            </a>
          </div>

          <div className="contact-small">
            <a
              href="https://wa.me/34644359005"
              target="_blank"
              rel="noopener noreferrer"
            >
              +34 644 359 605
            </a>
          </div>
        </div>

        <div className="socials">
          <div className="social-label">{tHome("footer_redes")}</div>

       <div className="social-icons">
  <a
    href="https://www.instagram.com/sosmaullidos/"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Instagram"
    className="insta"
  >
    <img className="insta" src="images/icons/instagram.png" alt="Instagram" />
  </a>

  <a
    href="https://www.facebook.com/sosmaullidos"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Facebook"
  >
    <img src="images/icons/facebook.png" alt="Facebook" />
  </a>

  <a
    href="https://www.tiktok.com/@sos.maullidos"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="TikTok"
  >
    <img src="images/icons/tik-tok.png" alt="TikTok" />
  </a>

  <a
    href="https://x.com/sos_maullidos"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="X"
  >
    <img src="images/icons/x.png" alt="X" />
  </a>
</div>

        </div>
      </div>

      {/* ===== BLOQUE SUBVENCIONES ===== */}
   <div className="footer-support">
  <div className="footer-support-title">
    {tHome("footer_support")}
  </div>

  <div className="footer-logos">
    <div className="footer-logo footer-logo--light">
      <img
        src="images/gobierno.png"
        alt="Gobierno de España - Ministerio de Derechos Sociales y Agenda 2030"
        className="gobierno"
      />
    </div>

    <div className="footer-logo footer-logo--dark">
      <img
        src="images/ayuntamiento.png"
        alt="Ajuntament de Pallejà"
        className="ayto"
      />
    </div>
  </div>
</div>

    </footer>
  );
}
