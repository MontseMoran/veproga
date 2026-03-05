import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../styles/admin.scss";

export default function AdminLayout() {
  const { t, i18n } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // cache admin para no consultar profiles cada vez
  const lastUidRef = useRef(null);
  const isAdminRef = useRef(false);

  // evita validaciones simultáneas
  const validatingRef = useRef(false);

  const nav = useNavigate();

  useEffect(() => {
    let alive = true;

    const goLogin = () => {
      if (!alive) return;
      setUser(null);
      setLoading(false);
      nav("/admin/login", { replace: true });
    };

    const resetCache = () => {
      lastUidRef.current = null;
      isAdminRef.current = false;
    };
const saved = localStorage.getItem("i18nextLng");
if (saved) {
  const normalized = saved.startsWith("ca") ? "cat" : saved;
  i18n.changeLanguage(normalized);
}
    const validate = async () => {
      if (validatingRef.current) return;
      validatingRef.current = true;

      //  anti-bloqueo
      const timeoutId = setTimeout(() => {
        if (!alive) return;
        resetCache();
        goLogin();
      }, 3000);

      try {
        setLoading(true);

        //  rápido: lee sesión cacheada
   const { data: userRes, error: userErr } = await supabase.auth.getUser();
const u = userRes?.user;
        console.log("AUTH USER ID:", u?.id);
        console.log("AUTH USER EMAIL:", u?.email);

        if (!alive) return;

    if (userErr || !u) {
  resetCache();
  goLogin();
  return;
}

        //  cache admin
        if (lastUidRef.current === u.id && isAdminRef.current === true) {
          setUser(u);
          setLoading(false);
          return;
        }

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();
        console.log("PROFILE RESULT:", profile);
        console.log("PROFILE ERROR:", profErr);

        if (!alive) return;

        if (profErr || !profile || profile.role !== "admin") {
          resetCache();
          goLogin();
          return;
        }

        lastUidRef.current = u.id;
        isAdminRef.current = true;

        setUser(u);
        setLoading(false);
        const { data, error } = await supabase.rpc("debug_auth");
        console.log("DEBUG AUTH:", data, error);
      } finally {
        clearTimeout(timeoutId);
        validatingRef.current = false;
      }
    };

    validate();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT") {
        resetCache();
        goLogin();
        return;
      }

      if (event === "SIGNED_IN") {
        validate();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [nav]);

  if (loading) return <div className="admin-loading">{t("loading_admin")}</div>;
  if (!user) return null;

  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-title">{t("admin_panel")}</h3>
<div className="admin-lang">
  <button
    type="button"
    className={`admin-lang__btn ${(i18n.language?.startsWith("cat") || i18n.language?.startsWith("ca")) ? "is-active" : ""}`}
    onClick={() => {
      i18n.changeLanguage("cat");
      localStorage.setItem("i18nextLng", "cat");
    }}
  >
    CAT
  </button>

  <button
    type="button"
    className={`admin-lang__btn ${i18n.language?.startsWith("es") ? "is-active" : ""}`}
    onClick={() => {
      i18n.changeLanguage("es");
      localStorage.setItem("i18nextLng", "es");
    }}
  >
    ES
  </button>
</div>
        <nav className="admin-links">
          <NavLink
  to="cats"
  className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}
>
  {t("admin_cats")}
</NavLink>

         <NavLink
  to="posts"
  className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}
>
  {t("admin_posts")}
</NavLink>

        </nav>

        <button
          className="admin-logout"
          onClick={async () => {
            await supabase.auth.signOut();
            resetCache();
            nav("/admin/login", { replace: true });
          }}
        >
          {t("admin_logout")}
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
