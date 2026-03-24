import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { uploadImageFile } from "../../lib/storage";
import "../../styles/shopProductForm.scss";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readDraft(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

export default function ShopProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const isEdit = useMemo(() => Boolean(id), [id]);
  const draftKey = useMemo(() => `shop-product-form-draft:${id || "new"}`, [id]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);
  const [subcategoriesReady, setSubcategoriesReady] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [removedExistingImages, setRemovedExistingImages] = useState([]);
  const [variants, setVariants] = useState([]);
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
  const [imagePickerMessage, setImagePickerMessage] = useState("");
  const [lastImageSelectionKey, setLastImageSelectionKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const imagePreviewUrls = useMemo(
    () =>
      imageFiles.map((file) => {
        try {
          return URL.createObjectURL(file);
        } catch {
          return "";
        }
      }),
    [imageFiles]
  );
  const availableSubcategories = useMemo(
    () =>
      subcategories.filter((subcategory) =>
        selectedCategoryIds.includes(subcategory.category_id)
      ),
    [selectedCategoryIds, subcategories]
  );
  const selectedImageNames = useMemo(
    () => imageFiles.map((file) => file?.name).filter(Boolean),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    console.log("shopProductForm:image-state", {
      imageFilesLength: imageFiles.length,
      imagePickerMessage,
      selectedImageNames,
      imagePreviewUrls,
    });
  }, [imageFiles, imagePickerMessage, selectedImageNames, imagePreviewUrls]);

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

        const { data: subcategoriesRows, error: subcategoriesError } = await supabase
          .from("shop_subcategories")
          .select("id, category_id, name, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (subcategoriesError) {
          console.warn("Subcategories load warning:", subcategoriesError.message);
          setSubcategories([]);
          setSubcategoriesReady(false);
        } else {
          setSubcategories(subcategoriesRows || []);
          setSubcategoriesReady(true);
        }

        if (!isEdit) {
          const draft = readDraft(draftKey);

          if (draft?.form) {
            setForm((current) => ({ ...current, ...draft.form }));
          }

          if (Array.isArray(draft?.selectedCategoryIds)) {
            setSelectedCategoryIds(draft.selectedCategoryIds);
          }

          if (Array.isArray(draft?.selectedSubcategoryIds)) {
            setSelectedSubcategoryIds(draft.selectedSubcategoryIds);
          }

          if (Array.isArray(draft?.variants)) {
            setVariants(draft.variants);
          }

          setLoading(false);
          return;
        }

        const [
          { data: productRow },
          { data: productCategories },
          { data: productSubcategories, error: productSubcategoriesError },
          { data: imagesRows },
          { data: variantsRows },
        ] = await Promise.all([
          supabase.from("shop_products").select("*").eq("id", id).single(),
          supabase
            .from("shop_product_categories")
            .select("category_id")
            .eq("product_id", id),
          supabase
            .from("shop_product_subcategories")
            .select("subcategory_id")
            .eq("product_id", id),
          supabase
            .from("shop_product_images")
            .select("id, image_url, path, sort_order")
            .eq("product_id", id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("shop_product_variants")
            .select("id, color, size, is_active, sku")
            .eq("product_id", id),
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
        setSelectedCategoryIds((productCategories || []).map((item) => item.category_id));
        if (!productSubcategoriesError) {
          setSelectedSubcategoryIds(
            (productSubcategories || []).map((item) => item.subcategory_id)
          );
        }
        setExistingImages(imagesRows || []);
        setRemovedExistingImages([]);
        setVariants(variantsRows || []);

        const draft = readDraft(draftKey);

        if (draft?.form) {
          setForm((current) => ({ ...current, ...draft.form }));
        }

        if (Array.isArray(draft?.selectedCategoryIds)) {
          setSelectedCategoryIds(draft.selectedCategoryIds);
        }

        if (Array.isArray(draft?.selectedSubcategoryIds)) {
          setSelectedSubcategoryIds(draft.selectedSubcategoryIds);
        }

        if (Array.isArray(draft?.variants)) {
          setVariants(draft.variants);
        }
      } catch (error) {
        alert(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [draftKey, id, isEdit]);

  useEffect(() => {
    if (loading) return;

    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          form,
          selectedCategoryIds,
          selectedSubcategoryIds,
          variants,
        })
      );
    } catch {
      // Ignore draft persistence failures.
    }
  }, [draftKey, form, loading, selectedCategoryIds, selectedSubcategoryIds, variants]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCategoryToggle(categoryId) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );

    setSelectedSubcategoryIds((current) =>
      current.filter((subcategoryId) => {
        const subcategory = subcategories.find((item) => item.id === subcategoryId);
        return subcategory && subcategory.category_id !== categoryId;
      })
    );
  }

  function handleSubcategoryToggle(subcategoryId) {
    setSelectedSubcategoryIds((current) =>
      current.includes(subcategoryId)
        ? current.filter((id) => id !== subcategoryId)
        : [...current, subcategoryId]
    );
  }

  function handleRemoveSelectedImage(indexToRemove) {
    setImageFiles((current) => {
      const nextFiles = current.filter((_, index) => index !== indexToRemove);
      setImagePickerMessage(
        nextFiles.length > 0
          ? `${nextFiles.length} imagen${nextFiles.length === 1 ? "" : "es"} seleccionada${
              nextFiles.length === 1 ? "" : "s"
            }.`
          : ""
      );
      return nextFiles;
    });
  }

  function handleImageInputChange(event) {
    const newFiles = Array.from(event.target.files || []).slice(0, 1);
    console.log("shopProductForm:image-change", {
      filesLength: newFiles.length,
      firstFile: newFiles[0]
        ? {
            name: newFiles[0].name,
            type: newFiles[0].type,
            size: newFiles[0].size,
            lastModified: newFiles[0].lastModified,
          }
        : null,
    });
    console.log("shopProductForm:before-set", {
      currentImageFilesLength: imageFiles.length,
      newFilesLength: newFiles.length,
    });

    if (newFiles.length === 0) {
      setImagePickerMessage("El dispositivo no ha entregado ninguna imagen.");
      return;
    }

    if (newFiles[0].size > 3 * 1024 * 1024) {
      setImagePickerMessage(
        `Imagen demasiado grande: ${formatFileSize(newFiles[0].size)}. Máximo 3 MB.`
      );
      event.currentTarget.value = "";
      return;
    }

    const selectionKey = newFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join("|");

    if (selectionKey === lastImageSelectionKey) {
      return;
    }

    setImageFiles((current) => {
      const nextFiles = [...current, ...newFiles];
      console.log("shopProductForm:set-image-files", {
        currentLength: current.length,
        nextLength: nextFiles.length,
        nextNames: nextFiles.map((file) => file.name),
      });
      return nextFiles;
    });
    setLastImageSelectionKey(selectionKey);
    setImagePickerMessage(
      `Imagen añadida: ${newFiles[0]?.name || "imagen"}`
    );

    event.currentTarget.value = "";
  }

  function moveItem(items, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= items.length) {
      return items;
    }

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    return nextItems;
  }

  function handleMoveSelectedImage(index, direction) {
    setImageFiles((current) => moveItem(current, index, index + direction));
  }

  function handleVariantChange(index, field, value) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    );
  }

  function handleAddVariant() {
    setVariants((current) => [
      ...current,
      { color: "", size: "", sku: "", is_active: true },
    ]);
  }

  function handleRemoveVariant(indexToRemove) {
    setVariants((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function handleRemoveExistingImage(imageId) {
    setExistingImages((current) => {
      const imageToRemove = current.find((image) => image.id === imageId);

      if (imageToRemove) {
        setRemovedExistingImages((removed) => [...removed, imageToRemove]);
      }

      return current.filter((image) => image.id !== imageId);
    });
  }

  function handleMoveExistingImage(index, direction) {
    setExistingImages((current) => moveItem(current, index, index + direction));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

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
        const { error } = await supabase.from("shop_products").update(payload).eq("id", id);
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

      await supabase.from("shop_product_categories").delete().eq("product_id", productId);

      if (selectedCategoryIds.length > 0) {
        await supabase.from("shop_product_categories").insert(
          selectedCategoryIds.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          }))
        );
      }

      try {
        await supabase
          .from("shop_product_subcategories")
          .delete()
          .eq("product_id", productId);

        if (selectedSubcategoryIds.length > 0) {
          const { error: productSubcategoriesError } = await supabase
            .from("shop_product_subcategories")
            .insert(
              selectedSubcategoryIds.map((subcategoryId) => ({
                product_id: productId,
                subcategory_id: subcategoryId,
              }))
            );

          if (productSubcategoriesError) throw productSubcategoriesError;
        }
      } catch (error) {
        console.warn("Product subcategories save warning:", error.message);
      }

      await supabase.from("shop_product_variants").delete().eq("product_id", productId);

      const cleanedVariants = variants
        .map((variant) => ({
          product_id: productId,
          color: variant.color?.trim() || null,
          size: variant.size?.trim() || null,
          sku: variant.sku?.trim() || null,
          is_active: variant.is_active ?? true,
        }))
        .filter((variant) => variant.color || variant.size || variant.sku);

      if (cleanedVariants.length > 0) {
        const { error: variantsError } = await supabase
          .from("shop_product_variants")
          .insert(cleanedVariants);

        if (variantsError) throw variantsError;
      }

      if (removedExistingImages.length > 0) {
        const removedImageIds = removedExistingImages.map((image) => image.id);
        const removedImagePaths = removedExistingImages
          .map((image) => image.path)
          .filter(Boolean);

        const { error: deleteImagesError } = await supabase
          .from("shop_product_images")
          .delete()
          .in("id", removedImageIds);

        if (deleteImagesError) throw deleteImagesError;

        if (removedImagePaths.length > 0) {
          for (const path of removedImagePaths) {
            const { error } = await supabase.functions.invoke("delete-product", {
              body: { path },
            });

            if (error) throw error;
          }
        }
      }

      if (existingImages.length > 0) {
        for (const [index, image] of existingImages.entries()) {
          const { error } = await supabase
            .from("shop_product_images")
            .update({ sort_order: index })
            .eq("id", image.id);

          if (error) throw error;
        }
      }

      if (uploadedImages.length > 0) {
        const imagesPayload = uploadedImages.map((img, index) => ({
          product_id: productId,
          image_url: img.publicUrl,
          path: img.path,
          sort_order: existingImages.length + index,
        }));

        const { error } = await supabase.from("shop_product_images").insert(imagesPayload);
        if (error) throw error;
      }

      window.localStorage.removeItem(draftKey);
      navigate("/admin/productos");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
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
            <div className="shop-product-form__categories">
              <label>Categorías</label>
              <div className="shop-product-form__categoryList">
                {categories.map((category) => (
                  <label key={category.id} className="shop-product-form__categoryOption">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {subcategoriesReady ? (
            <div className="full">
              <div className="shop-product-form__categories">
                <label>Subcategorías</label>
                {selectedCategoryIds.length === 0 ? (
                  <p className="shop-product-form__helper">
                    Selecciona primero una categoría principal.
                  </p>
                ) : availableSubcategories.length === 0 ? (
                  <p className="shop-product-form__helper">
                    No hay subcategorías activas para las categorías seleccionadas.
                  </p>
                ) : (
                  <div className="shop-product-form__categoryList">
                    {availableSubcategories.map((subcategory) => (
                      <label
                        key={subcategory.id}
                        className="shop-product-form__categoryOption"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubcategoryIds.includes(subcategory.id)}
                          onChange={() => handleSubcategoryToggle(subcategory.id)}
                        />
                        <span>{subcategory.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

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
            <div className="shop-product-form__filePicker">
              <button
                type="button"
                className="shop-product-form__fileButton"
                onClick={() => {
                  console.log("shopProductForm:open-picker");
                  imageInputRef.current?.click();
                }}
              >
                Seleccionar archivo
              </button>
              <input
                ref={imageInputRef}
                id="image"
                type="file"
                name="image"
                accept=".jpg,.jpeg,.png,.webp,.avif,image/*"
                onChange={handleImageInputChange}
                className="shop-product-form__fileInput"
              />
            </div>
            {imagePickerMessage ? (
              <p className="shop-product-form__helper">
                {imagePickerMessage}
              </p>
            ) : null}
            {selectedImageNames.length > 0 ? (
              <p className="shop-product-form__helper">
                Seleccionadas: {selectedImageNames.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="full">
            <div className="shop-product-form__variants">
              <div className="shop-product-form__variantsHeader">
                <label>Tallas y colores</label>
                <button
                  type="button"
                  className="shop-product-form__addVariant"
                  onClick={handleAddVariant}
                >
                  Añadir opción
                </button>
              </div>

              {variants.length === 0 ? (
                <p className="shop-product-form__variantsEmpty">
                  Todavía no hay tallas o colores cargados.
                </p>
              ) : (
                <div className="shop-product-form__variantList">
                  {variants.map((variant, index) => (
                    <div key={variant.id || index} className="shop-product-form__variantCard">
                      <div>
                        <label htmlFor={`variant-color-${index}`}>Color</label>
                        <input
                          id={`variant-color-${index}`}
                          value={variant.color || ""}
                          onChange={(event) =>
                            handleVariantChange(index, "color", event.target.value)
                          }
                          placeholder="Azul cielo"
                        />
                      </div>

                      <div>
                        <label htmlFor={`variant-size-${index}`}>Talla</label>
                        <input
                          id={`variant-size-${index}`}
                          value={variant.size || ""}
                          onChange={(event) =>
                            handleVariantChange(index, "size", event.target.value)
                          }
                          placeholder="6 meses"
                        />
                      </div>

                      <div>
                        <label htmlFor={`variant-sku-${index}`}>SKU variante</label>
                        <input
                          id={`variant-sku-${index}`}
                          value={variant.sku || ""}
                          onChange={(event) =>
                            handleVariantChange(index, "sku", event.target.value)
                          }
                          placeholder="Opcional"
                        />
                      </div>

                      <label className="checkbox shop-product-form__variantToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(variant.is_active)}
                          onChange={(event) =>
                            handleVariantChange(index, "is_active", event.target.checked)
                          }
                        />
                        <span>Disponible</span>
                      </label>

                      <button
                        type="button"
                        className="admin-action admin-action--danger"
                        onClick={() => handleRemoveVariant(index)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shop-product-form__images-row">
            {imageFiles.length > 0 ? (
              <div className="shop-product-form__images-block">
                <label>Nuevas imágenes seleccionadas</label>
                <div className="admin-image-preview">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="admin-image-item">
                      {index === 0 ? (
                        <span className="admin-image-badge">Principal</span>
                      ) : null}
                      {imagePreviewUrls[index] ? (
                        <img
                          src={imagePreviewUrls[index]}
                          alt={`Nueva imagen ${index + 1}`}
                          className="admin-image-preview__img"
                        />
                      ) : (
                        <div className="admin-image-preview__fallback">
                          <span>{file.name || `Imagen ${index + 1}`}</span>
                        </div>
                      )}
                      <div className="admin-image-actions">
                        <button
                          type="button"
                          className="admin-image-order"
                          onClick={() => handleMoveSelectedImage(index, -1)}
                          disabled={index === 0}
                          aria-label={`Mover imagen ${index + 1} arriba`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-image-order"
                          onClick={() => handleMoveSelectedImage(index, 1)}
                          disabled={index === imageFiles.length - 1}
                          aria-label={`Mover imagen ${index + 1} abajo`}
                        >
                          ↓
                        </button>
                      </div>
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
            ) : null}

            {existingImages.length > 0 ? (
              <div className="shop-product-form__images-block">
                <label>Imágenes actuales</label>
                <div className="admin-image-preview">
                  {existingImages.map((image, index) => (
                    <div key={image.id || image.path || index} className="admin-image-item">
                      {index === 0 ? (
                        <span className="admin-image-badge">Principal</span>
                      ) : null}
                      <img
                        src={image.image_url}
                        alt={form.name || "Producto"}
                        className="admin-image-preview__img"
                      />
                      <div className="admin-image-actions">
                        <button
                          type="button"
                          className="admin-image-order"
                          onClick={() => handleMoveExistingImage(index, -1)}
                          disabled={index === 0}
                          aria-label={`Mover imagen actual ${index + 1} arriba`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-image-order"
                          onClick={() => handleMoveExistingImage(index, 1)}
                          disabled={index === existingImages.length - 1}
                          aria-label={`Mover imagen actual ${index + 1} abajo`}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="admin-image-remove"
                        onClick={() => handleRemoveExistingImage(image.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}
