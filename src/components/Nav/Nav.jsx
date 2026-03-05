import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./nav.scss";

export default function Nav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const catsRef = useRef(null);
  const helpRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCatsOpen(false);
        setHelpOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (catsRef.current && !catsRef.current.contains(e.target)) {
        setCatsOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const closeAll = () => {
    setOpen(false);
    setCatsOpen(false);
    setHelpOpen(false);
  };

  const navClass = ({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`;

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="nav-left">
          <Link to="/" className="brand" aria-label={t("brand")}>
            <img
              src="images/logo_transp.png"
              alt={t("brand")}
              className="brand-logo"
            />
          </Link>
          <div className="nav-drawer">
            <nav id="main-menu" className={`links ${open ? "open" : ""}`}>
              <div className="links-inner">
                <NavLink to="/" className={navClass} onClick={closeAll} end>
                  {t("home")}
                </NavLink>

                <NavLink
                  to="/blog"
                  className={navClass}
                  onClick={closeAll}
                >
                  {t("blog")}
                </NavLink>

                <NavLink to="/noticias" className={navClass} onClick={closeAll}>
                  {t("news")}
                </NavLink>

                <NavLink
                  to="/quienes-somos"
                  className={navClass}
                  onClick={closeAll}
                >
                  {t("about")}
                </NavLink>

                <NavLink to="/contacto" className={navClass} onClick={closeAll}>
                  {t("contact")}
                </NavLink>

                <div className="dropdown" ref={catsRef}>
                  <button
                    className="drop-btn nav-cta"
                    aria-haspopup="true"
                    aria-expanded={catsOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatsOpen((v) => !v);
                    }}
                  >
                    {t("cats")} <span className="caret" aria-hidden="true" />
                  </button>

                  <div className={`drop-panel ${catsOpen ? "open" : ""}`}>
                    <NavLink
                      to="/adopcion"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("cats_adoption")}
                    </NavLink>

                    <NavLink
                      to="/casos-dificiles"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("cats_special_cases")}
                    </NavLink>

                    <NavLink
                      to="/ultimos-adoptados"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("cats_latest_adopted")}
                    </NavLink>
                  </div>
                </div>

                {/* COM AJUDAR (dropdown) */}
                <div className="dropdown" ref={helpRef}>
                  <button
                    className="drop-btn nav-cta"
                    aria-haspopup="true"
                    aria-expanded={helpOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHelpOpen((v) => !v);
                    }}
                  >
                    {t("cta_how_help")} <span className="caret" aria-hidden="true" />
                  </button>

                  <div className={`drop-panel ${helpOpen ? "open" : ""}`}>
                    <NavLink
                      to="/donar"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("help_donate")}
                    </NavLink>

                    <NavLink
                      to="/compras-solidarias"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("help_shop")}
                    </NavLink>

                    <NavLink
                      to="/voluntariat"
                      className="drop-item"
                      onClick={closeAll}
                    >
                      {t("help_volunteer")}
                    </NavLink>
                  </div>
                </div>



              </div>
            </nav>
          </div>
        </div>

        <div className="nav-right">
          <LanguageSelector />
          <button
            className={`hamburger ${open ? "is-open" : ""}`}
            aria-label={open ? t("close_menu") : t("open_menu")}
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>
        </div>

        <div
          className={`overlay ${open ? "show" : ""}`}
          onClick={closeAll}
          aria-hidden={!open}
        />
      </div>
    </header>
  );
}
