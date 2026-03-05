import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getLatestAdoptedCats } from "../lib/catsCache";
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

function getCatImageUrl(imagePath) {
  if (!imagePath) return "";
  return supabase.storage.from("cats").getPublicUrl(imagePath).data.publicUrl;
}

export default function LatestAdopted() {
  const { t, i18n } = useTranslation("common");
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const isCat = i18n.language?.startsWith("cat");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const data = await getLatestAdoptedCats(10);
      if (mounted) setCats(data || []);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="adoption">
      <div className="adoption__container">
        <header className="adoption__header reveal-on-scroll" style={{ "--reveal-delay": "80ms" }}>
          <h1 className="adoption__title">{t("cats_latest_adopted")}</h1>
          <p className="adoption__intro">{t("cats_latest_adopted_intro")}</p>
        </header>

        {loading ? (
          <p className="adoption__muted">{t("loading")}</p>
        ) : cats.length === 0 ? (
          <p className="adoption__muted">{t("cats_latest_adopted_empty")}</p>
        ) : (
          <section className="adoption__grid" aria-label={t("cats_latest_adopted_aria")}>
            {cats.map((cat, index) => {
              const desc = (isCat ? cat.description_cat : cat.description_es) || cat.description_es || cat.description_cat || "";
              const imgUrl = getCatImageUrl(cat.image_path);

              return (
                <article
                  key={cat.id}
                  className="cat-card reveal-on-scroll"
                  style={{ "--reveal-delay": `${80 + index * 90}ms` }}
                >
                  <div className="cat-card__media">
                    <div className="cat-card__imgWrap">
                      <div
                        className={`cat-card__imgFrame ${imgUrl ? "has-image" : ""}`}
                        style={imgUrl ? { "--cat-bg": `url(${imgUrl})` } : undefined}
                      >
                        {imgUrl ? (
                          <img className="cat-card__img" src={imgUrl} alt={cat.name} loading="lazy" />
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
                    </div>

                    {desc ? (
                      <p className="cat-card__desc is-clamped">{desc}</p>
                    ) : (
                      <p className="cat-card__desc cat-card__desc--empty">{t("description_empty")}</p>
                    )}

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
