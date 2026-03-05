import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../styles/admin.scss";

export default function Login() {
  const { t, i18n } = useTranslation("admin");
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentLang =
    i18n.language?.startsWith("cat") || i18n.language?.startsWith("ca")
      ? "cat"
      : "es";

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

 const handleLogin = async (e) => {
  e.preventDefault();
  setErrorMsg("");
  setLoading(true);

  try {
    const username = email.trim().toLowerCase();
    const internalEmail = username.includes("@")
      ? username
      : `${username}@sosmaullidos.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      nav("/admin", { replace: true });
    } catch {
      setErrorMsg("Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth">
      <div className="admin-auth__card">
        <div className="admin-lang">
          <button
            type="button"
            className={`admin-lang__btn ${currentLang === "es" ? "is-active" : ""}`}
            onClick={() => changeLang("es")}
          >
            ES
          </button>
          <button
            type="button"
            className={`admin-lang__btn ${currentLang === "cat" ? "is-active" : ""}`}
            onClick={() => changeLang("cat")}
          >
            CAT
          </button>
        </div>

        <h1 className="admin-auth__title">{t("admin_login_title")}</h1>
        <p className="admin-auth__subtitle">{t("admin_note")}</p>

        <form className="admin-auth__form" onSubmit={handleLogin}>
          <label className="admin-auth__label">{t("admin_email")}</label>
          <input
            className="admin-auth__input"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            
          />

          <label className="admin-auth__label">{t("admin_password")}</label>
          <div className="admin-auth__passwordWrap">
            <input
              className="admin-auth__input admin-auth__input--password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="admin-auth__passwordToggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? currentLang === "cat"
                    ? "Amagar contrasenya"
                    : "Ocultar contraseña"
                  : currentLang === "cat"
                    ? "Mostrar contrasenya"
                    : "Mostrar contraseña"
              }
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                  <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5 0 9.27 3.11 11 7.5a11.84 11.84 0 0 1-4.14 5.24" />
                  <path d="M6.61 6.61A11.83 11.83 0 0 0 1 12.41c1.73 4.39 6 7.5 11 7.5a10.94 10.94 0 0 0 5.16-1.26" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {errorMsg ? <div className="admin-auth__error">{errorMsg}</div> : null}

          <button className="admin-auth__btn" type="submit" disabled={loading}>
            {loading ? t("admin_entering") : t("admin_enter")}
          </button>
        </form>
      </div>
    </div>
  );
}
