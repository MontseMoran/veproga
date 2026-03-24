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

  if (message.includes("shop_categories_slug_key")) {
    return "Ya existe una categoría con ese slug. Cambia el nombre o el slug.";
  }

  return message || "No se pudo guardar la categoría.";
}

export default function ShopCategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isEdit) return;

      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .eq("id", id)
        .single();

      if (!active) return;

      if (error) {
        alert(getFriendlyErrorMessage(error));
      } else if (data) {
        setForm({
          slug: data.slug || "",
          name: data.name || "",
          description: data.description || "",
          sort_order: data.sort_order ?? 0,
          is_active: data.is_active ?? true,
        });
      }

      setLoading(false);
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

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim() || null,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    };

    const query = isEdit
      ? supabase.from("shop_categories").update(payload).eq("id", id)
      : supabase.from("shop_categories").insert([payload]);

    const { error } = await query;
    setSaving(false);

    if (error) {
      alert(getFriendlyErrorMessage(error));
      return;
    }

    navigate("/admin/categorias");
  }

  return (
    <div className="admin-form">
      <h2>{isEdit ? "Editar categoría" : "Nueva categoría"}</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <form className="admin-form__grid" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="se-autogenera-si-lo-dejas-vacío"
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
              Categoría visible en la tienda
            </label>
          </div>

          <div className="full">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar categoría"}
          </button>
        </form>
      )}
    </div>
  );
}
