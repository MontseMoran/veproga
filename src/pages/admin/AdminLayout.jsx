import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../../styles/admin.scss";

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const lastUidRef = useRef(null);
  const isAdminRef = useRef(false);
  const validatingRef = useRef(false);
  const nav = useNavigate();

  const resetCache = () => {
    lastUidRef.current = null;
    isAdminRef.current = false;
  };

  useEffect(() => {
    let alive = true;

    const goLogin = () => {
      if (!alive) return;
      setUser(null);
      setLoading(false);
      nav("/admin/login", { replace: true });
    };

    const validate = async () => {
      if (validatingRef.current) return;
      validatingRef.current = true;

      const timeoutId = setTimeout(() => {
        if (!alive) return;
        resetCache();
        goLogin();
      }, 3000);

      try {
        setLoading(true);

        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        const currentUser = userRes?.user;

        if (!alive) return;

        if (userErr || !currentUser) {
          resetCache();
          goLogin();
          return;
        }

        if (lastUidRef.current === currentUser.id && isAdminRef.current === true) {
          setUser(currentUser);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("admin_users")
          .select("id")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!alive) return;

        if (profileError || !profile ) {
          resetCache();
          goLogin();
          return;
        }

        lastUidRef.current = currentUser.id;
        isAdminRef.current = true;
        setUser(currentUser);
        setLoading(false);
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

  if (loading) return <div className="admin-loading">Cargando panel...</div>;
  if (!user) return null;

  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-title">Panel de administracion</h3>

        <nav className="admin-links">
          <NavLink to="/admin" end className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Resumen
          </NavLink>

          <NavLink to="categorias" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Categorias
          </NavLink>

          <NavLink to="productos" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Productos
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
          Cerrar sesion
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
