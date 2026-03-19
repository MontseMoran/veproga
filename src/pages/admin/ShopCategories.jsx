import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ShopCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      }

      if (active) {
        setItems(data || []);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id) {
    if (!confirm("Se borrará la categoría.")) {
      return;
    }

    const { error } = await supabase.from("shop_categories").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div>
      <h2>Categorías</h2>

      <div className="admin-top-actions">
        <Link to="/admin/categorias/nueva" className="admin-action admin-action--primary">
          Nueva categoría
        </Link>
      </div>

      {loading ? <p>Cargando...</p> : null}
      {!loading && items.length === 0 ? <p>No hay categorías creadas.</p> : null}

      {!loading ? (
        <div className="grid">
          {items.map((item) => (
            <div key={item.id} className="card">
              <h4>{item.name}</h4>
              <p>{item.description || "Sin descripción."}</p>
              <p><strong>Slug:</strong> {item.slug}</p>
              <p><strong>Orden:</strong> {item.sort_order ?? 0}</p>
              <p><strong>Estado:</strong> {item.is_active ? "Activa" : "Oculta"}</p>

              <div className="actions">
                <Link
                  to={`/admin/categorias/${item.id}/editar`}
                  className="admin-action admin-action--edit"
                >
                  Editar
                </Link>

                <button
                  type="button"
                  className="admin-action admin-action--danger"
                  onClick={() => handleDelete(item.id)}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
