import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ShopSubcategories() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const groupedItems = useMemo(() => {
    const sourceItems =
      selectedCategoryId === "all"
        ? items
        : items.filter((item) => item.category_id === selectedCategoryId);

    return categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        items: sourceItems.filter((item) => item.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, items, selectedCategoryId]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          { data: subcategoriesData, error: subcategoriesError },
          { data: categoriesData, error: categoriesError },
        ] = await Promise.all([
          supabase
            .from("shop_subcategories")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
          supabase
            .from("shop_categories")
            .select("id, name")
            .order("sort_order", { ascending: true }),
        ]);

        if (subcategoriesError) throw subcategoriesError;
        if (categoriesError) throw categoriesError;

        if (!active) return;
        setItems(subcategoriesData || []);
        setCategories(categoriesData || []);
        setLoadError("");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setItems([]);
        setCategories([]);
        setLoadError(
          'No se pudieron cargar las subcategorias. Falta crear la tabla "shop_subcategories" o sus permisos.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id) {
    if (!confirm("Se borrara la subcategoria.")) {
      return;
    }

    try {
      const { error } = await supabase.from("shop_subcategories").delete().eq("id", id);
      if (error) throw error;
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div>
      <h2>Subcategorias</h2>

      <div className="admin-top-actions">
        <Link to="/admin/subcategorias/nueva" className="admin-action admin-action--primary">
          Nueva subcategoria
        </Link>
      </div>

      {!loading && !loadError && categories.length > 0 ? (
        <div className="admin-filterBar">
          <span className="admin-filterBar__label">Categoría</span>
          <select
            className="admin-filterBar__select"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? <p>Cargando...</p> : null}
      {!loading && loadError ? <p>{loadError}</p> : null}
      {!loading && !loadError && items.length === 0 ? <p>No hay subcategorias creadas.</p> : null}

      {!loading && !loadError ? (
        <div className="admin-sectionList">
          {groupedItems.map((group) => (
            <section key={group.id} className="admin-sectionBlock">
              <div className="admin-sectionBlock__header">
                <h3>{group.name}</h3>
                <span className="admin-sectionBlock__count">
                  {group.items.length}
                </span>
              </div>

              <div className="grid">
                {group.items.map((item) => (
                  <div key={item.id} className="card">
                    <h4>{item.name}</h4>
                    <p>{item.description || "Sin descripcion."}</p>
                    <p>
                      <strong>Slug:</strong> {item.slug}
                    </p>
                    <p>
                      <strong>Orden:</strong> {item.sort_order ?? 0}
                    </p>
                    <p>
                      <strong>Estado:</strong> {item.is_active ? "Activa" : "Oculta"}
                    </p>

                    <div className="actions">
                      <Link
                        to={`/admin/subcategorias/${item.id}/editar`}
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
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
