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
  const hasUserRef = useRef(false);
  const nav = useNavigate();

  const resetCache = () => {
    lastUidRef.current = null;
    isAdminRef.current = false;
    hasUserRef.current = false;
  };

  useEffect(() => {
    hasUserRef.current = Boolean(user);
  }, [user]);

  useEffect(() => {
    let alive = true;

    const goLogin = (errorMsg = "") => {
      if (!alive) return;
      setUser(null);
      setLoading(false);
      nav("/admin/login", {
        replace: true,
        state: errorMsg ? { errorMsg } : {},
      });
    };

    const validateUser = async (currentUser) => {
      if (!currentUser) {
        resetCache();
        goLogin("No se ha encontrado una sesión activa. Vuelve a iniciar sesión.");
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

      if (profileError || !profile) {
        resetCache();
        goLogin("La cuenta ha iniciado sesión, pero no tiene permisos de administración.");
        return;
      }

      lastUidRef.current = currentUser.id;
      isAdminRef.current = true;
      hasUserRef.current = true;
      setUser(currentUser);
      setLoading(false);
    };

    const validate = async () => {
      if (validatingRef.current) return;
      validatingRef.current = true;

      const timeoutId = setTimeout(() => {
        if (!alive) return;
        resetCache();
        goLogin("La comprobación de acceso está tardando demasiado. Revisa la conexión e inténtalo de nuevo.");
      }, 10000);

      try {
        setLoading((current) => (hasUserRef.current ? current : true));

        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
        const currentUser = sessionRes?.session?.user;

        if (!alive) return;

        if (sessionErr || !currentUser) {
          resetCache();
          goLogin("No se pudo recuperar la sesión. Vuelve a iniciar sesión.");
          return;
        }

        await validateUser(currentUser);
      } finally {
        clearTimeout(timeoutId);
        validatingRef.current = false;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        resetCache();
        goLogin("La sesión se ha cerrado.");
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void validate();
      }
    });

    void validate();

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
        <h3 className="admin-title">Panel de administración</h3>

        <nav className="admin-links">
          <NavLink to="/admin" end className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Resumen
          </NavLink>

          <NavLink to="categorias" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Categorías
          </NavLink>

          <NavLink to="subcategorias" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Subcategorías
          </NavLink>

          <NavLink to="productos" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Productos
          </NavLink>

          <NavLink to="pedidos" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Pedidos
          </NavLink>

          <NavLink to="descuentos" className={({ isActive }) => `admin-link ${isActive ? "is-active" : ""}`}>
            Descuentos
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
          Cerrar sesión
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
