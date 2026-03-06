import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import { getPublishedCatsByStatus } from "../lib/catsCache";
import "../styles/cats.scss";

function toValidDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffYMD(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

function getAgeLabel(birthDate, t) {
  const b = toValidDate(birthDate);
  if (!b) return t("age_unknown");

  const now = new Date();
  const { years, months } = diffYMD(b, now);

  if (years <= 0) {
    const m = Math.max(1, months);
    return t("age_months", { count: m });
  }
  if (months === 0) {
    return t("age_years", { count: years });
  }

  const yearLabel = t("age_years", { count: years });
  const monthLabel = t("age_months", { count: months });
  return `${yearLabel} ${monthLabel}`;
}

function getSexLabel(sex, t) {
  const key = sex === "male" ? "sex_male" : sex === "female" ? "sex_female" : "sex_unknown";
  return t(key);
}

function getSterilizedLabel(sterilized, t) {
  return sterilized ? t("sterilized_yes") : t("sterilized_no");
}

function isPositiveResult(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["positive", "positivo", "positiva", "positiu"].includes(normalized);
}

function getPositiveHealthChips(cat, t) {
  const chips = [];
  if (isPositiveResult(cat?.felv_result)) chips.push(t("health_felv_positive"));
  if (isPositiveResult(cat?.fiv_result)) chips.push(t("health_fiv_positive"));
  return chips;
}

export default function Cases() {
  const { t, i18n } = useTranslation("common");
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const isCat = i18n.language?.startsWith("cat");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await getPublishedCatsByStatus("caso_especial", {
        orderBy: "updated_at",
        ascending: false,
      });
      if (mounted) setCats(data || []);
      if (mounted) setLoading(false);
    })();
    return () => (mounted = false);
  }, []);

  return (
    <main className="adoption">
      <div className="adoption__container">
        <header className="adoption__header reveal-on-scroll" style={{ "--reveal-delay": "80ms" }}>
          <h1 className="adoption__title">{t("cats_special_cases")}</h1>
        </header>

        {loading ? (
          <section className="cases-loading" aria-live="polite" aria-busy="true">
            <p className="adoption__muted cases-loading__text">{t("loading")}</p>
            <div className="cases-loading__walk" aria-hidden="true">
              <span className="cases-loading__paw cases-loading__paw--first" />
              <span className="cases-loading__paw cases-loading__paw--second" />
            </div>
          </section>
        ) : (
          <section className="adoption__grid" aria-label={t("cats_special_cases")}>
            {cats.map((cat, index) => {
              const desc =
                (isCat ? cat.description_cat : cat.description_es) ||
                cat.description_es ||
                cat.description_cat ||
                "";

              const imageUrl = cat.image_path
                ? supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_BUCKET || "cats")
                    .getPublicUrl(cat.image_path).data.publicUrl
                : "";
              const healthChips = getPositiveHealthChips(cat, t);

              return (
                <article
                  key={cat.id}
                  className="cat-card reveal-on-scroll"
                  style={{ "--reveal-delay": `${100 + index * 90}ms` }}
                >
                  <div className="cat-card__media">
                    <div className="cat-card__imgWrap">
                      <div
                        className={`cat-card__imgFrame ${imageUrl ? "has-image" : ""}`}
                        style={imageUrl ? { "--cat-bg": `url(${imageUrl})` } : undefined}
                      >
                        {imageUrl ? (
                          <img className="cat-card__img" src={imageUrl} alt={cat.name} loading="lazy" />
                        ) : (
                          <div className="cat-card__imgPlaceholder" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="cat-card__body">
                    <h3 className="cat-card__name">{cat.name}</h3>

                    <div className="cat-card__meta">
                      <span className="cat-chip">{getAgeLabel(cat.birth_date, t)}</span>
                      <span className="cat-chip">{getSexLabel(cat.sex, t)}</span>
                      <span className="cat-chip">{getSterilizedLabel(!!cat.sterilized, t)}</span>
                      {healthChips.map((chipLabel) => (
                        <span key={`${cat.id}-${chipLabel}`} className="cat-chip cat-chip--health-positive">
                          {chipLabel}
                        </span>
                      ))}
                    </div>

                    <p className="cat-card__desc is-clamped">
                      {desc || t("description_empty")}
                    </p>

                    <Link className="cat-card__readmore" to={`/adopcion/${cat.id}`}>
                      {t("read_more")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}


