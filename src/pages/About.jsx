import React from "react";
import { useTranslation } from "react-i18next";
import coloniaImg from "../../public/images/colonia.jpg"; // ajusta la ruta si hace falta
import "../styles/about.scss";


export default function About() {
  const { t } = useTranslation("about");

  return (
    <main className="container about">

      <section className="about-hero reveal-on-scroll" style={{ "--reveal-delay": "60ms" }}>
        <p className="about-claim">{t("claim")}</p>
        
        <p className="about-intro">{t("intro")}</p>

        <img
          src={coloniaImg}
          alt={t("image_alt")}
          className="about-image"
        />
        <p className="about-caption">{t("image_caption")}</p>
      </section>

      <section className="about-section reveal-on-scroll" style={{ "--reveal-delay": "140ms" }}>
        <h2>{t("who_title")}</h2>
        <p>{t("who_text_1")}</p>
        <p>{t("who_text_2")}</p>
        <p>{t("who_text_3")}</p>
      </section>

      <section className="about-section reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
        <h2>{t("mission_title")}</h2>

        <ul className="about-list">
          <li>
            <strong>{t("mission_1_title")}</strong>
            <p>{t("mission_1_text")}</p>
          </li>

          <li>
            <strong>{t("mission_2_title")}</strong>
            <p>{t("mission_2_text")}</p>
          </li>

          <li>
            <strong>{t("mission_3_title")}</strong>
            <p>{t("mission_3_text")}</p>
          </li>

          <li>
            <strong>{t("mission_4_title")}</strong>
            <p>{t("mission_4_text")}</p>
          </li>
        </ul>
      </section>

      <section className="about-section reveal-on-scroll" style={{ "--reveal-delay": "300ms" }}>
        <h2>{t("support_title")}</h2>
        <p>{t("support_text")}</p>
      </section>

      <section className="about-section about-highlight reveal-on-scroll" style={{ "--reveal-delay": "380ms" }}>
        <p>{t("transparency")}</p>
      </section>
    </main>
  );
}
