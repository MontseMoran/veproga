import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SupportForm from "../components/SupportForm/SupportForm";
import "../styles/donate.scss";

export default function Donate() {
  const { t } = useTranslation("help");

  const [open, setOpen] = useState(null); 

  const toggle = (key) => {
    setOpen((prev) => (prev === key ? null : key));
  };

  return (
    <main className="donate">
      <div className="donate__container">
        <header className="donate__header reveal-on-scroll" style={{ "--reveal-delay": "60ms" }}>
          <h1 className="donate__title">{t("donate_title")}</h1>
          <p className="donate__intro">{t("donate_intro")}</p>
        </header>

        <div className="donate__grid">
          
          <section className="donate__block reveal-on-scroll" style={{ "--reveal-delay": "120ms" }} aria-labelledby="donate-bank-title">
            <h2 id="donate-bank-title" className="donate__blockTitle">
              {t("donate_bank_title")}
            </h2>

            <div className="donate__bank">
              <p className="donate__text">
                <strong>{t("donate_bank_iban_label")}:</strong> ES65 2100 0388
                1002 0028 6069
              </p>
              <p className="donate__text">
                <strong>{t("donate_bank_holder_label")}:</strong> SOS Maullidos
              </p>
              <p className="donate__text">
                <strong>{t("donate_bank_concept_label")}:</strong> Donación SOS
                Maullidos
              </p>
              <p className="donate__hint">{t("donate_bank_note")}</p>
            </div>
          </section>

        
          <section className="donate__block reveal-on-scroll" style={{ "--reveal-delay": "200ms" }} aria-labelledby="donate-teaming-title">
            <h2 id="donate-teaming-title" className="donate__blockTitle">
              {t("donate_teaming_title")}
            </h2>
            <p className="donate__text">{t("donate_teaming_text")}</p>

            <a
              className="donate__pillLink"
              href="https://www.teaming.net/sosmaullidos"
              target="_blank"
              rel="noreferrer"
            >
              {t("donate_teaming_cta")}
            </a>
          </section>

          <section className="donate__block reveal-on-scroll" style={{ "--reveal-delay": "280ms" }} aria-labelledby="donate-shop-title">
            <h2 id="donate-shop-title" className="donate__blockTitle">
              {t("donate_shop_title")}
            </h2>
            <p className="donate__text">{t("donate_shop_text")}</p>

            <div className="donate__links">
              <a
                className="donate__pillLink"
                href="https://www.gosigatalimentacio.org/ca/39-sos-maullidos"
                target="_blank"
                rel="noreferrer"
              >
                {t("donate_gos_i_gat_cta")}
              </a>

              <a
                className="donate__pillLink"
                href="https://www.amazon.es/hz/wishlist/ls/1EXW0OQXB7M6B?ref_=wl_share"
                target="_blank"
                rel="noreferrer"
              >
                {t("donate_amazon_cta")}
              </a>
            </div>
          </section>

         
          <section
            className="donate__block donate__block--wide reveal-on-scroll"
            style={{ "--reveal-delay": "360ms" }}
            aria-labelledby="donate-member-title"
          >
            <div className="donate__row">
              <div>
                <h2 id="donate-member-title" className="donate__blockTitle">
                  {t("donate_member_title")}
                </h2>
                <p className="donate__text">{t("donate_member_text")}</p>
              </div>

              <button
                type="button"
               className="donate__toggle donate__toggle--form"
                onClick={() => toggle("member")}
                aria-expanded={open === "member"}
                aria-controls="donate-member-form"
              >
                {open === "member"
                  ? t("help_close_form")
                  : t("help_open_form")}
              </button>
            </div>

            {open === "member" && (
              <div id="donate-member-form" className="donate__form">
                <SupportForm mode="member" showAmount={false} />
              </div>
            )}
          </section>

          
          <section
            className="donate__block donate__block--wide reveal-on-scroll"
            style={{ "--reveal-delay": "440ms" }}
            aria-labelledby="donate-sponsor-title"
          >
            <div className="donate__row">
              <div>
                <h2 id="donate-sponsor-title" className="donate__blockTitle">
                  {t("donate_sponsor_title")}
                </h2>
                <p className="donate__text">{t("donate_sponsor_text")}</p>
              </div>

              <button
                type="button"
                className="donate__toggle donate__toggle--form"
                onClick={() => toggle("sponsor")}
                aria-expanded={open === "sponsor"}
                aria-controls="donate-sponsor-form"
              >
                {open === "sponsor"
                  ? t("help_close_form")
                  : t("help_open_form")}
              </button>
            </div>

            {open === "sponsor" && (
              <div id="donate-sponsor-form" className="donate__form">
                <SupportForm mode="sponsor" showAmount={false} />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
