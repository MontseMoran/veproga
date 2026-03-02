import React from "react";
import { useTranslation } from "react-i18next";
import SupportForm from "../components/SupportForm/SupportForm";
import "../styles/volunteer.scss";

export default function Volunteer() {
  const { t } = useTranslation("help");

  return (
    <main className="volunteer">
      <div className="volunteer__container">

        <header className="volunteer__header">
          <h1 className="volunteer__title">
            {t("volunteer_title")}
          </h1>
          <p className="volunteer__intro">
            {t("volunteer_intro")}
          </p>
        </header>

        <section className="volunteer__block">
          <h2 className="volunteer__blockTitle">
            {t("volunteer_how_title")}
          </h2>

          <ul className="volunteer__list">
            <li>{t("volunteer_help_events")}</li>
            <li>{t("volunteer_help_transport")}</li>
            <li>{t("volunteer_help_foster")}</li>
            <li>{t("volunteer_help_diffusion")}</li>
            <li>{t("volunteer_help_feed_colonies")}</li>
            <li>{t("volunteer_help_local")}</li>
            <li>{t("volunteer_help_materials")}</li>
          </ul>

          <p className="volunteer__text">
            {t("volunteer_how_note")}
          </p>
        </section>

        <section className="volunteer__block volunteer__block--form">
          <h2 className="volunteer__blockTitle">
            {t("volunteer_form_title")}
          </h2>

          <p className="volunteer__text">
            {t("volunteer_form_text")}
          </p>

          <div className="volunteer__form">
            <SupportForm mode="volunteer" />
          </div>
        </section>

      </div>
    </main>
  );
}