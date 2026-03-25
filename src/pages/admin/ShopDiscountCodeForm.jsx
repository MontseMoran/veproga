import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function getFriendlyErrorMessage(error) {
  const message = String(error?.message || "");

  if (message.includes("shop_discount_codes_code_key")) {
    return "Ya existe un código de descuento con ese nombre.";
  }

  return message || "No se pudo guardar el descuento.";
}

export default function ShopDiscountCodeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percent",
    value: 0,
    min_order_amount: 0,
    valid_from: "",
    valid_until: "",
    usage_limit: 1,
    is_active: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isEdit) return;

      const { data, error } = await supabase
        .from("shop_discount_codes")
        .select("*")
        .eq("id", id)
        .single();

      if (!active) return;

      if (error) {
        alert(getFriendlyErrorMessage(error));
      } else if (data) {
        setForm({
          code: data.code || "",
          description: data.description || "",
          type: data.type || "percent",
          value: data.value ?? 0,
          min_order_amount: data.min_order_amount ?? 0,
          valid_from: data.valid_from ? String(data.valid_from).slice(0, 16) : "",
          valid_until: data.valid_until ? String(data.valid_until).slice(0, 16) : "",
          usage_limit: data.usage_limit ?? 1,
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
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      type: form.type,
      value: Number(form.value || 0),
      min_order_amount: Number(form.min_order_amount || 0),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      usage_limit: Number(form.usage_limit || 1),
      is_active: form.is_active,
    };

    const query = isEdit
      ? supabase.from("shop_discount_codes").update(payload).eq("id", id)
      : supabase.from("shop_discount_codes").insert([payload]);

    const { error } = await query;
    setSaving(false);

    if (error) {
      alert(getFriendlyErrorMessage(error));
      return;
    }

    navigate("/admin/descuentos");
  }

  return (
    <div className="admin-form">
      <h2>{isEdit ? "Editar descuento" : "Nuevo descuento"}</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <form className="admin-form__grid" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code">Código</label>
            <input
              id="code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="VERANO10"
              required
            />
          </div>

          <div>
            <label htmlFor="type">Tipo de descuento</label>
            <select id="type" name="type" value={form.type} onChange={handleChange}>
              <option value="percent">Porcentaje</option>
              <option value="fixed">Importe fijo</option>
            </select>
          </div>

          <div>
            <label htmlFor="value">Valor {form.type === "percent" ? "(%)" : "(EUR)"}</label>
            <input
              id="value"
              name="value"
              type="number"
              min="0"
              step={form.type === "percent" ? "1" : "0.01"}
              value={form.value}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="min_order_amount">Pedido mínimo</label>
            <input
              id="min_order_amount"
              name="min_order_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.min_order_amount}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="valid_from">Inicio</label>
            <input
              id="valid_from"
              name="valid_from"
              type="datetime-local"
              value={form.valid_from}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="valid_until">Fin</label>
            <input
              id="valid_until"
              name="valid_until"
              type="datetime-local"
              value={form.valid_until}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="usage_limit">Límite de usos</label>
            <input
              id="usage_limit"
              name="usage_limit"
              type="number"
              min="1"
              step="1"
              value={form.usage_limit}
              onChange={handleChange}
            />
          </div>

          <div className="checkbox full">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              Descuento activo en la tienda
            </label>
          </div>

          <div className="full">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="10% en artículos seleccionados"
            />
          </div>

          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar descuento"}
          </button>
        </form>
      )}
    </div>
  );
}
