import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";
import { getPublishedCatById } from "../lib/catsCache";
import "../styles/catDetail.scss";
import BackLink from "../components/backLink/BackLink";
import SupportForm from "../components/SupportForm/SupportForm";


function getCatImageUrl(imagePath) {
  if (!imagePath) return "";
  return supabase.storage.from("cats").getPublicUrl(imagePath).data.publicUrl;
}

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
  if (years <= 0) return t("age_months", { count: Math.max(1, months) });

  if (months === 0) return t("age_years", { count: years });

  const yearLabel = t("age_years", { count: years });
  const monthLabel = t("age_months", { count: months });
  return `${yearLabel} ${monthLabel}`;
}

function getSexLabel(sex, t) {
  const key =
    sex === "male" ? "sex_male" : sex === "female" ? "sex_female" : "sex_unknown";
  return t(key);
}

function getSterilizedLabel(sterilized, t) {
  return sterilized ? t("sterilized_yes") : t("sterilized_no");
}

function isPositiveResult(value) {
  return String(value || "").toLowerCase() === "positive";
}

function getPositiveHealthChips(cat, t) {
  const chips = [];
  if (isPositiveResult(cat?.felv_result)) chips.push(t("health_felv_positive"));
  if (isPositiveResult(cat?.fiv_result)) chips.push(t("health_fiv_positive"));
  return chips;
}

function getStatusLabel(status, t) {
  if (!status) return "";
  const key = `status_${status}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return status.replaceAll("_", " ");
}

export default function CatDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation("common");
  const [cat, setCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const adoptRef = useRef(null);
  useEffect(() => {
    if (isOpen && adoptRef.current) {
      adoptRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [isOpen]);
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const data = await getPublishedCatById(id);
      if (mounted) setCat(data || null);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="cat-detail">
        <div className="cat-detail__container">
          <p className="cat-detail__muted">{t("loading")}</p>
        </div>
      </main>
    );
  }

  if (!cat) {
    return (
      <main className="cat-detail">
        <div className="cat-detail__container">
          <h1 className="cat-detail__title">{t("not_found_title")}</h1>
          <p className="cat-detail__muted">{t("not_found_text")}</p>
          <Link className="cat-detail__back" to="/adopcion">
            {t("back_to_adoption")}
          </Link>
        </div>
      </main>
    );
  }

  const imgUrl = getCatImageUrl(cat.image_path);
  const isCat = i18n.language === "cat";
  const healthChips = getPositiveHealthChips(cat, t);

  const desc = (
    isCat
      ? (cat.description_cat || cat.description_es || "")
      : (cat.description_es || cat.description_cat || "")
  ).trim();

  return (
    <main className="cat-detail">
      <div className="cat-detail__container">
        <BackLink to="/adopcion" />

        <section className="cat-detail__grid">
          <div className="cat-detail__media" >
            <div className="cat-detail__imgWrap">
              <div className="cat-detail__imgFrame">
                {imgUrl ? (
                  <>
                    <img className="cat-detail__imgBg" src={imgUrl} alt="" aria-hidden="true" />
                    <img className="cat-detail__img" src={imgUrl} alt={cat.name} />
                  </>
                ) : (
                  <div className="cat-detail__imgPlaceholder" />
                )}
              </div>
            </div>
          </div>

          <div className="cat-detail__body">
            <h1 className="cat-detail__name">{cat.name}</h1>

            <div className="cat-detail__meta">
              <span className="cat-chip">{getAgeLabel(cat.birth_date, t)}</span>
              <span className="cat-chip">{getSexLabel(cat.sex, t)}</span>
              <span className="cat-chip">
                {getSterilizedLabel(!!cat.sterilized, t)}
              </span>
              {cat.status && <span className="cat-chip">{getStatusLabel(cat.status, t)}</span>}
              {healthChips.map((chipLabel) => (
                <span key={`${cat.id}-${chipLabel}`} className="cat-chip cat-chip--health-positive">
                  {chipLabel}
                </span>
              ))}
            </div>

            {desc ? (
              <p className="cat-detail__desc">{desc}</p>
            ) : (
              <p className="cat-detail__desc cat-detail__desc--empty">
                {t("description_empty")}
              </p>

            )}
            <button
              type="button"
              className={`cat-detail__cta ${isOpen ? "is-open" : ""}`}
              onClick={() => setIsOpen(v => !v)}
            >
              <span>
                {isOpen
                  ? t("adopt_cta_close")
                  : t("adopt_cta_open", { name: cat.name })}
              </span>

              <span className="cat-detail__ctaIcon">
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="cat-detail__adoptPanel" ref={adoptRef}>
                <SupportForm
                  mode="adoption"
                  context={{ catId: cat.id, catName: cat.name }}
                  onSuccess={() => setIsOpen(false)}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
