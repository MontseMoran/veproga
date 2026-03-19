import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { uploadImageFile } from "../../lib/storage";
import "../../styles/ShopProductForm.scss"

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ShopProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [existingImagePath, setExistingImagePath] = useState([]);

  const [form, setForm] = useState({
    sku: "",
    slug: "",
    name: "",
    description: "",
    price_eur: "",
    is_pack: false,
    is_active: true,
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
useEffect(() => {
  return () => {
    imageFiles.forEach((file) => {
      URL.revokeObjectURL(file);
    });
  };
}, [imageFiles]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data: categoryRows, error: categoriesError } = await supabase
          .from("shop_categories")
          .select("id, name, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (categoriesError) throw categoriesError;
        if (!active) return;

        setCategories(categoryRows || []);

        if (!isEdit) {
          setLoading(false);
          return;
        }

        const [
          { data: productRow },
          { data: productCategories },
          { data: imagesRows },
        ] = await Promise.all([
          supabase.from("shop_products").select("*").eq("id", id).single(),
          supabase
            .from("shop_product_categories")
            .select("category_id")
            .eq("product_id", id),
          supabase
            .from("shop_product_images")
            .select("image_url, path")
            .eq("product_id", id)
            .order("sort_order", { ascending: true }),
        ]);

        if (!active) return;

        setForm({
          sku: productRow.sku || "",
          slug: productRow.slug || "",
          name: productRow.name || "",
          description: productRow.description || "",
          price_eur: productRow.price_eur ?? "",
          is_pack: productRow.is_pack ?? false,
          is_active: productRow.is_active ?? true,
        });

        setSelectedCategoryIds((productCategories || []).map((c) => c.category_id));
        setExistingImagePath(imagesRows?.map((img) => img.path) || []);
      } catch (error) {
        alert(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => (active = false);
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCategoryToggle(categoryId) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }
function handleRemoveSelectedImage(indexToRemove) {
  setImageFiles((current) =>
    current.filter((_, index) => index !== indexToRemove)
  );
}
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const previousImagePath = existingImagePath;
    let uploadedImages = [];

    try {
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const uploaded = await uploadImageFile(file, "shop-products");
          uploadedImages.push(uploaded);
        }
      }

      const payload = {
        sku: form.sku.trim(),
        slug: slugify(form.slug || form.name),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_eur: form.price_eur === "" ? null : Number(form.price_eur),
        is_pack: form.is_pack,
        is_active: form.is_active,
      };

      if (!payload.sku) throw new Error("SKU obligatorio");
      if (!payload.name) throw new Error("Nombre obligatorio");

      let productId = id;

      if (isEdit) {
        const { error } = await supabase
          .from("shop_products")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("shop_products")
          .insert([payload])
          .select("id")
          .single();

        if (error) throw error;
        productId = data.id;
      }

      await supabase
        .from("shop_product_categories")
        .delete()
        .eq("product_id", productId);

      if (selectedCategoryIds.length > 0) {
        await supabase.from("shop_product_categories").insert(
          selectedCategoryIds.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          }))
        );
      }

      if (uploadedImages.length > 0) {
        if (previousImagePath?.length > 0) {
          for (const path of previousImagePath) {
            const { error } = await supabase.functions.invoke("delete-product", {
              body: { path },
            });

            if (error) throw error;
          }
        }

        await supabase
          .from("shop_product_images")
          .delete()
          .eq("product_id", productId);

        const imagesPayload = uploadedImages.map((img, index) => ({
          product_id: productId,
          image_url: img.publicUrl,
          path: img.path,
          sort_order: index,
        }));

        const { error } = await supabase
          .from("shop_product_images")
          .insert(imagesPayload);

        if (error) throw error;

        setExistingImagePath(uploadedImages.map((img) => img.path));
      }

      navigate("/admin/productos");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }
const imagePreviewUrls = imageFiles.map((file) => URL.createObjectURL(file));
async function handleRemoveExistingImage(pathToDelete, indexToRemove) {
  // 1. borrar de storage
  const { error } = await supabase.functions.invoke("delete-product", {
    body: { path: pathToDelete },
  });

  if (error) {
    console.error(error);
    return;
  }

  // 2. actualizar estado local
  setExistingImagePath((current) =>
    current.filter((_, i) => i !== indexToRemove)
  );
}
return (
  <div className="admin-form">
    <h2>{isEdit ? "Editar producto" : "Nuevo producto"}</h2>

    {loading ? (
      <p>Cargando...</p>
    ) : (
      <form className="admin-form__grid" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="sku">SKU</label>
          <input
            id="sku"
            name="sku"
            value={form.sku}
            onChange={handleChange}
            required
          />
        </div>

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
          />
        </div>

        <div>
          <label htmlFor="price_eur">Precio EUR</label>
          <input
            id="price_eur"
            name="price_eur"
            type="number"
            value={form.price_eur}
            onChange={handleChange}
          />
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

        <div className="full">
          <label htmlFor="image">Imágenes</label>
          <input
            id="image"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
  const newFiles = Array.from(e.target.files || []);
  setImageFiles((current) => [...current, ...newFiles]);
}}
          />
        </div>

    <div className="shop-product-form__images-row">
  {imageFiles.length > 0 && (
    <div className="shop-product-form__images-block">
      <label>Nuevas imágenes seleccionadas</label>
      <div className="admin-image-preview">
       {imageFiles.map((file, index) => (
  <div key={index} className="admin-image-item">
    <img
      src={imagePreviewUrls[index]}
      alt={`Nueva imagen ${index + 1}`}
      className="admin-image-preview__img"
    />

    <button
      type="button"
      className="admin-image-remove"
      onClick={() => handleRemoveSelectedImage(index)}
    >
      ×
    </button>
  </div>
))}
      </div>
    </div>
  )}

{existingImagePath.length > 0 && (
  <div className="shop-product-form__images-block">
    <label>Imágenes actuales</label>
    <div className="admin-image-preview">
      {existingImagePath.map((path, index) => (
        <div key={path || index} className="admin-image-item">
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/store-assets/${path}`}
            alt={form.name || "Producto"}
            className="admin-image-preview__img"
          />
          <button
            type="button"
            className="admin-image-remove"
            onClick={() => handleRemoveExistingImage(path, index)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </div>
)}
</div>

        <button type="submit" className="admin-btn-primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    )}
  </div>
);
}