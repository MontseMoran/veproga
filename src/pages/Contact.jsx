import React from "react";
import { useTranslation } from "react-i18next";
import "../styles/contact.scss";


export default function Contact() {
  const { t } = useTranslation("contact");

  return (
    <main className="contact-page">
      <div className="container contact-page__content">
        {/* CONTACTO DIRECTO */}
        <section className="card">
          <h2>{t("contact_subtitle")}</h2>
          <p className="muted">{t("contact_intro")}</p>

          <p>
            <strong>{t("contact_email_label")}</strong>{" "}
            <a href="mailto:sos.maullidos@gmail.com">
              sos.maullidos@gmail.com
            </a>
          </p>

          <p>
            <strong>{t("contact_whatsapp_label")}</strong>{" "}
            <a
              href="https://wa.me/34644359005"
              target="_blank"
              rel="noopener noreferrer"
            >
              +34 644 359 605
            </a>
          </p>
        </section>

        {/* SI ENCUENTRAS UN GATO */}
        <section className="card">
          <h2>{t("rescue_title")}</h2>
          <p className="muted">{t("rescue_intro")}</p>

          <ul className="secondary-list">
            <li>{t("rescue_step_1")}</li>
            <li>{t("rescue_step_2")}</li>
            <li>{t("rescue_step_3")}</li>
          </ul>

          <p className="muted">{t("rescue_note")}</p>
        </section>
      </div>
    </main>
  );
}
