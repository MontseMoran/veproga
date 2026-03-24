import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFriendlyErrorMessage(error) {
  const message = String(error?.message || "");

  if (message.includes("shop_subcategories_slug_key")) {
    return "Ya existe una subcategoría con ese slug. Cambia el nombre o el slug.";
  }

  return message || "No se pudo guardar la subcategoría.";
}

export default function ShopSubcategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [categories, setCategories] = useState([]);
  const [tableReady, setTableReady] = useState(true);
  const [form, setForm] = useState({
    category_id: "",
    slug: "",
    name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("shop_categories")
          .select("id, name, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (categoriesError) throw categoriesError;
        if (!active) return;

        setCategories(categoriesData || []);

        if (!isEdit) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("shop_subcategories")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!active) return;

        setForm({
          category_id: data.category_id || "",
          slug: data.slug || "",
          name: data.name || "",
          description: data.description || "",
          sort_order: data.sort_order ?? 0,
          is_active: data.is_active ?? true,
        });
      } catch (error) {
        console.error(error);
        if (!active) return;
        setTableReady(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        category_id: form.category_id || null,
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
      };

      if (!payload.category_id) throw new Error("Selecciona una categoria principal");
      if (!payload.name) throw new Error("Nombre obligatorio");

      const query = isEdit
        ? supabase.from("shop_subcategories").update(payload).eq("id", id)
        : supabase.from("shop_subcategories").insert([payload]);

      const { error } = await query;
      if (error) throw error;

      navigate("/admin/subcategorias");
    } catch (error) {
      alert(getFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form">
      <h2>{isEdit ? "Editar subcategoria" : "Nueva subcategoria"}</h2>

      {loading ? <p>Cargando...</p> : null}
      {!loading && !tableReady ? (
        <p>Falta la tabla "shop_subcategories" o sus permisos en Supabase.</p>
      ) : null}

      {!loading && tableReady ? (
        <form className="admin-form__grid" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="category_id">Categoria principal</label>
            <select
              id="category_id"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} required />
          </div>

          <div>
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="se-autogenera-si-lo-dejas-vacio"
            />
          </div>

          <div>
            <label htmlFor="sort_order">Orden</label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={handleChange}
            />
          </div>

          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              Subcategoria visible en la tienda
            </label>
          </div>

          <div className="full">
            <label htmlFor="description">Descripcion</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar subcategoria"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
