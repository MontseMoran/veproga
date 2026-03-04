import React from "react";
import { useTranslation } from "react-i18next";
import "../styles/shop.scss";

export default function Shop() {
  const { t } = useTranslation("help");

  return (
    <main className="shop">
      <div className="shop__container">

        <header className="shop__header reveal-on-scroll" style={{ "--reveal-delay": "60ms" }}>
          <h1 className="shop__title">{t("shop_title")}</h1>
          <p className="shop__intro">{t("shop_intro")}</p>
        </header>

       
        <section className="shop__block shop__block--featured reveal-on-scroll" style={{ "--reveal-delay": "120ms" }}>
          <h2 className="shop__blockTitle">
            {t("shop_other_title")}
          </h2>

          <p className="shop__text">
            {t("shop_other_text_strong")}
          </p>

          <div className="shop__links">
            <a
              href="https://www.vinted.es/member/187388390-sosmaullidos"
              target="_blank"
              rel="noreferrer"
              className="shop__pillLink"
            >
              {t("shop_vinted_cta")}
            </a>

            <a
              href="https://es.wallapop.com/user/sosmaullidosp-275011390"
              target="_blank"
              rel="noreferrer"
              className="shop__pillLink"
            >
              {t("shop_wallapop_cta")}
            </a>
          </div>
        </section>

      
        <section className="shop__block reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
          <h2 className="shop__blockTitle">
            {t("shop_bodas_title")}
          </h2>

          <p className="shop__text">
            {t("shop_bodas_text")}
          </p>

          <a
            href="https://www.bodas.net/detalles-de-bodas/sos-maullidos--e158091"
            target="_blank"
            rel="noreferrer"
            className="shop__pillLink"
          >
            {t("shop_bodas_cta")}
          </a>
        </section>

        
        <section className="shop__block reveal-on-scroll" style={{ "--reveal-delay": "320ms" }}>
          <h2 className="shop__blockTitle">
            {t("shop_amazon_title")}
          </h2>

          <p className="shop__text">
            {t("shop_amazon_text")}
          </p>

          <a
            href="https://www.amazon.es/hz/wishlist/ls/1EXW0OQXB7M6B?ref_=wl_share"
            target="_blank"
            rel="noreferrer"
            className="shop__pillLink"
          >
            {t("shop_amazon_cta")}
          </a>
        </section>

       
        <section className="shop__block reveal-on-scroll" style={{ "--reveal-delay": "420ms" }}>
          <h2 className="shop__blockTitle">
            {t("shop_gos_title")}
          </h2>

          <p className="shop__text">
            {t("shop_gos_text")}
          </p>

          <a
            href="https://www.gosigatalimentacio.org/ca/39-sos-maullidos"
            target="_blank"
            rel="noreferrer"
            className="shop__pillLink"
          >
            {t("shop_gos_cta")}
          </a>
        </section>

      </div>
    </main>
  );
}
