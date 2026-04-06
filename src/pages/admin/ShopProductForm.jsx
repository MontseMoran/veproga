import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { uploadImageFile } from "../../lib/storage";
import { cropImageFile } from "../../utils/imageResize";
import "../../styles/shopProductForm.scss";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveUniqueProductSlug(supabaseClient, desiredSlug, currentProductId = null) {
  const baseSlug = slugify(desiredSlug) || "producto";

  const { data, error } = await supabaseClient
    .from("shop_products")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) throw error;

  const takenSlugs = new Set(
    (data || [])
      .filter((row) => !currentProductId || row.id !== currentProductId)
      .map((row) => String(row.slug || "").trim())
      .filter(Boolean)
  );

  if (!takenSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let nextSuffix = 2;

  while (takenSlugs.has(`${baseSlug}-${nextSuffix}`)) {
    nextSuffix += 1;
  }

  return `${baseSlug}-${nextSuffix}`;
}

function mapProductSaveError(error) {
  const message = String(error?.message || "");

  if (message.includes("shop_products_slug_key")) {
    return "Ya existe otro producto con la misma URL. Cambia el nombre del producto para que sea distinto.";
  }

  return message || "No se pudo guardar el producto.";
}

function mapDeleteProductFunctionError(error) {
  const message = String(error?.message || "").trim();

  if (message.includes("Edge Function returned a non-2xx status code")) {
    return "No se pudo borrar la imagen del producto.";
  }

  return message || "No se pudo borrar la imagen del producto.";
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

function createVariantGroupId() {
  return `variant-group-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeVariantsForUi(items) {
  const colorGroupIds = new Map();

  return (items || []).map((variant) => {
    const colorKey = String(variant?.color || "").trim().toLowerCase();
    const preservedGroupId = variant?.ui_group_id;

    if (preservedGroupId) {
      return { ...variant, ui_group_id: preservedGroupId };
    }

    if (colorKey) {
      if (!colorGroupIds.has(colorKey)) {
        colorGroupIds.set(colorKey, createVariantGroupId());
      }

      return {
        ...variant,
        ui_group_id: colorGroupIds.get(colorKey),
      };
    }

    return {
      ...variant,
      ui_group_id: createVariantGroupId(),
    };
  });
}

function getCropPreviewStyle({ width, height, zoom, offsetX, offsetY }) {
  const frameWidth = 280;
  const frameHeight = 350;
  const baseScale = Math.max(frameWidth / width, frameHeight / height);
  const finalScale = baseScale * Math.max(1, zoom);
  const scaledWidth = width * finalScale;
  const scaledHeight = height * finalScale;
  const maxShiftX = Math.max(0, (scaledWidth - frameWidth) / 2);
  const maxShiftY = Math.max(0, (scaledHeight - frameHeight) / 2);

  return {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    left: `${(frameWidth - scaledWidth) / 2 + offsetX * maxShiftX}px`,
    top: `${(frameHeight - scaledHeight) / 2 + offsetY * maxShiftY}px`,
  };
}

export default function ShopProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const savingRef = useRef(false);
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
    is_heavy_shipping: false,
    is_active: true,
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePickerMessage, setImagePickerMessage] = useState("");
  const [lastImageSelectionKey, setLastImageSelectionKey] = useState("");
  const [debugLines, setDebugLines] = useState([]);
  const [cropState, setCropState] = useState(null);
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
  const cropPreviewStyle = useMemo(
    () => (cropState ? getCropPreviewStyle(cropState) : null),
    [cropState]
  );
  const variantGroups = useMemo(() => {
    const grouped = new Map();

    variants.forEach((variant, index) => {
      const groupId = variant.ui_group_id || createVariantGroupId();
      const currentGroup = grouped.get(groupId);

      if (!currentGroup) {
        grouped.set(groupId, {
          groupId,
          color: variant.color || "",
          items: [{ variant, index }],
        });
        return;
      }

      currentGroup.items.push({ variant, index });
      if (!currentGroup.color && variant.color) {
        currentGroup.color = variant.color;
      }
    });

    return Array.from(grouped.values());
  }, [variants]);

  function pushDebugLine(message) {
    setDebugLines((current) => {
      const timestamp = new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return [`${timestamp} · ${message}`, ...current].slice(0, 8);
    });
  }

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    return () => {
      if (cropState?.previewUrl) {
        URL.revokeObjectURL(cropState.previewUrl);
      }
    };
  }, [cropState]);

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
          console.warn("Aviso al cargar subcategorías:", subcategoriesError.message);
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
            setVariants(normalizeVariantsForUi(draft.variants));
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
            .select("id, color, size, price_eur, is_active, sku")
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
          is_heavy_shipping: productRow.is_heavy_shipping ?? false,
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
        setVariants(normalizeVariantsForUi(variantsRows || []));

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
          setVariants(normalizeVariantsForUi(draft.variants));
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
    pushDebugLine("Se eliminó una imagen seleccionada.");
  }

  function addSelectedImage(file, selectionKey) {
    const isDuplicateSelection = imageFiles.some(
      (currentFile) =>
        `${currentFile.name}:${currentFile.size}:${currentFile.lastModified}` === selectionKey
    );

    if (selectionKey === lastImageSelectionKey || isDuplicateSelection) {
      pushDebugLine("Se repitió la misma imagen y no se añadió de nuevo.");
      return false;
    }

    setImageFiles((current) => [...current, file]);
    setLastImageSelectionKey(selectionKey);
    setImagePickerMessage(`Imagen añadida: ${file?.name || "imagen"}`);
    pushDebugLine(`Imagen recibida: ${file?.name || "imagen"} (${formatFileSize(file.size)}).`);
    return true;
  }

  async function handleImageInputChange(event) {
    const newFiles = Array.from(event.target.files || []).slice(0, 1);

    if (newFiles.length === 0) {
      setImagePickerMessage("El dispositivo no ha entregado ninguna imagen.");
      pushDebugLine("El selector volvió sin imagen.");
      return;
    }

    if (newFiles[0].size > 3 * 1024 * 1024) {
      setImagePickerMessage(
        `Imagen demasiado grande: ${formatFileSize(newFiles[0].size)}. Máximo 3 MB.`
      );
      pushDebugLine(
        `Imagen rechazada por tamaño: ${newFiles[0].name || "imagen"} (${formatFileSize(newFiles[0].size)}).`
      );
      event.currentTarget.value = "";
      return;
    }

    const selectionKey = newFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join("|");
    const selectedFile = newFiles[0];

    try {
      const previewUrl = URL.createObjectURL(selectedFile);
      const imageData = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = previewUrl;
      });

      setCropState({
        file: selectedFile,
        originalSelectionKey: selectionKey,
        previewUrl,
        width: imageData.width,
        height: imageData.height,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        processing: false,
      });
      pushDebugLine(`Imagen lista para recorte: ${selectedFile.name || "imagen"}.`);
    } catch {
      setImagePickerMessage("No se pudo preparar la imagen para recortarla.");
      pushDebugLine("Error al abrir el recorte de la imagen.");
    }

    event.currentTarget.value = "";
  }

  function handleCropCancel() {
    if (cropState?.previewUrl) {
      URL.revokeObjectURL(cropState.previewUrl);
    }

    setCropState(null);
    setImagePickerMessage("Selección cancelada antes de añadir la imagen.");
    pushDebugLine("Se canceló el recorte de la imagen.");
  }

  async function handleCropConfirm() {
    if (!cropState?.file) return;

    setCropState((current) => (current ? { ...current, processing: true } : current));

    try {
      const croppedFile = await cropImageFile(cropState.file, {
        aspectRatio: 4 / 5,
        zoom: cropState.zoom,
        offsetX: cropState.offsetX,
        offsetY: cropState.offsetY,
      });

      const croppedSelectionKey = `${cropState.originalSelectionKey}:crop:${Math.round(
        cropState.zoom * 100
      )}:${Math.round(cropState.offsetX * 100)}:${Math.round(cropState.offsetY * 100)}`;

      addSelectedImage(croppedFile, croppedSelectionKey);
      pushDebugLine("Recorte aplicado antes de añadir la imagen.");

      if (cropState.previewUrl) {
        URL.revokeObjectURL(cropState.previewUrl);
      }

      setCropState(null);
    } catch (error) {
      setImagePickerMessage(error.message || "No se pudo recortar la imagen.");
      pushDebugLine(`Error al recortar imagen: ${error.message}`);
      setCropState((current) => (current ? { ...current, processing: false } : current));
    }
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
    pushDebugLine(direction < 0 ? "Se movió una imagen hacia arriba." : "Se movió una imagen hacia abajo.");
  }

  function handleVariantChange(index, field, value) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    );
  }

  function handleVariantGroupColorChange(groupId, value) {
    setVariants((current) =>
      current.map((variant) =>
        variant.ui_group_id === groupId ? { ...variant, color: value } : variant
      )
    );
  }

  function handleAddVariant() {
    setVariants((current) => [
      ...current,
        {
          color: "",
          size: "",
          price_eur: "",
          sku: "",
          is_active: true,
          ui_group_id: createVariantGroupId(),
      },
    ]);
  }

  function handleAddVariantSize(groupId) {
    setVariants((current) => {
      const groupColor =
        current.find((variant) => variant.ui_group_id === groupId)?.color || "";

      return [
        ...current,
        {
          color: groupColor,
          size: "",
          price_eur: "",
          sku: "",
          is_active: true,
          ui_group_id: groupId,
        },
      ];
    });
  }

  function handleRemoveVariant(indexToRemove) {
    setVariants((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function handleRemoveVariantGroup(groupId) {
    setVariants((current) => current.filter((variant) => variant.ui_group_id !== groupId));
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
    pushDebugLine(
      direction < 0
        ? "Se movió una imagen actual hacia arriba."
        : "Se movió una imagen actual hacia abajo."
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) {
      pushDebugLine("Se ignoró un segundo intento de guardado mientras el anterior seguía en curso.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    pushDebugLine("Se inició el guardado del producto.");

    let uploadedImages = [];

    try {
      const resolvedSlug = await resolveUniqueProductSlug(
        supabase,
        form.slug || form.name,
        isEdit ? id : null
      );

      const payload = {
        sku: form.sku.trim(),
        slug: resolvedSlug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_eur: form.price_eur === "" ? null : Number(form.price_eur),
        is_pack: form.is_pack,
        is_heavy_shipping: form.is_heavy_shipping,
        is_active: form.is_active,
      };

      if (!payload.sku) throw new Error("SKU obligatorio");
      if (!payload.name) throw new Error("Nombre obligatorio");

      let productId = id;

      if (isEdit) {
        const { error } = await supabase.from("shop_products").update(payload).eq("id", id);
        if (error) throw error;
        pushDebugLine("Producto actualizado correctamente.");
      } else {
        const { data, error } = await supabase
          .from("shop_products")
          .insert([payload])
          .select("id")
          .single();

        if (error) throw error;
        productId = data.id;
        pushDebugLine("Producto creado correctamente.");
      }

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          pushDebugLine(
            `Procesando imagen para subida: ${file.name || "imagen"} (${formatFileSize(file.size)}).`
          );
          const uploaded = await uploadImageFile(file, "shop-products");
          pushDebugLine(`Imagen subida correctamente: ${uploaded.path}`);
          uploadedImages.push(uploaded);
        }
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
        console.warn("Aviso al guardar subcategorías del producto:", error.message);
      }

      await supabase.from("shop_product_variants").delete().eq("product_id", productId);

      const cleanedVariants = variants
        .map((variant) => ({
          product_id: productId,
          color: variant.color?.trim() || null,
          size: variant.size?.trim() || null,
          price_eur:
            variant.price_eur === "" || variant.price_eur === null || variant.price_eur === undefined
              ? null
              : Number(variant.price_eur),
          sku: variant.sku?.trim() || null,
          is_active: variant.is_active ?? true,
        }))
        .filter(
          (variant) =>
            variant.color ||
            variant.size ||
            variant.sku ||
            variant.price_eur !== null
        );

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
        pushDebugLine("Las rutas de imagen se guardaron en la base de datos.");
      }

      window.localStorage.removeItem(draftKey);
      pushDebugLine("Guardado completo. Redirigiendo al listado.");
      navigate("/admin/productos");
    } catch (error) {
      if (uploadedImages.length > 0) {
        pushDebugLine("Falló el guardado. Se intentará limpiar del bucket las imágenes nuevas.");

        for (const image of uploadedImages) {
          try {
            const { error: cleanupError } = await supabase.functions.invoke("delete-product", {
              body: { path: image.path },
            });

            if (cleanupError) {
              console.warn("No se pudo limpiar una imagen subida tras error:", cleanupError.message);
            }
          } catch (cleanupError) {
            console.warn("No se pudo limpiar una imagen subida tras error:", cleanupError);
          }
        }
      }

      const message =
        String(error?.message || "").includes("Edge Function returned a non-2xx status code")
          ? mapDeleteProductFunctionError(error)
          : mapProductSaveError(error);
      pushDebugLine(`Error al guardar: ${message}`);
      alert(message);
    } finally {
      savingRef.current = false;
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

          <div>
            <label className="checkbox" htmlFor="is_heavy_shipping">
              <input
                id="is_heavy_shipping"
                name="is_heavy_shipping"
                type="checkbox"
                checked={form.is_heavy_shipping}
                onChange={handleChange}
              />
              <span>Producto pesado (envío 7,95 €)</span>
            </label>
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
                onClick={() => imageInputRef.current?.click()}
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
            <div className="shop-product-form__debug">
              <p className="shop-product-form__debugTitle">Depuración de imágenes</p>
              {debugLines.length > 0 ? (
                <ul className="shop-product-form__debugList">
                  {debugLines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="shop-product-form__debugEmpty">
                  Todavía no hay eventos de depuración.
                </p>
              )}
            </div>
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
                  Añadir color
                </button>
              </div>

              {variants.length === 0 ? (
                <p className="shop-product-form__variantsEmpty">
                  Todavía no hay colores cargados. Añade uno y luego sus tallas.
                </p>
              ) : (
                <div className="shop-product-form__variantGroups">
                  {variantGroups.map((group, groupIndex) => (
                    <div key={group.groupId} className="shop-product-form__variantGroup">
                      <div className="shop-product-form__variantGroupHeader">
                        <div className="shop-product-form__variantGroupColor">
                          <label htmlFor={`variant-group-color-${groupIndex}`}>Color</label>
                          <input
                            id={`variant-group-color-${groupIndex}`}
                            value={group.color}
                            onChange={(event) =>
                              handleVariantGroupColorChange(group.groupId, event.target.value)
                            }
                            placeholder="Negro"
                          />
                        </div>

                        <div className="shop-product-form__variantGroupActions">
                          <button
                            type="button"
                            className="shop-product-form__addVariant"
                            onClick={() => handleAddVariantSize(group.groupId)}
                          >
                            Añadir talla
                          </button>

                          <button
                            type="button"
                            className="admin-action admin-action--danger"
                            onClick={() => handleRemoveVariantGroup(group.groupId)}
                          >
                            Quitar color
                          </button>
                        </div>
                      </div>

                      <div className="shop-product-form__variantList">
                        {group.items.map(({ variant, index }) => (
                          <div
                            key={variant.id || `${group.groupId}-${index}`}
                            className="shop-product-form__variantCard"
                          >
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

                            <div>
                              <label htmlFor={`variant-price-${index}`}>Precio variante EUR</label>
                              <input
                                id={`variant-price-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.price_eur ?? ""}
                                onChange={(event) =>
                                  handleVariantChange(index, "price_eur", event.target.value)
                                }
                                placeholder="Si cambia respecto al producto"
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
                              Quitar talla
                            </button>
                          </div>
                        ))}
                      </div>
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

          <div className="shop-product-form__submit">
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {cropState ? (
        <div className="shop-product-form__cropOverlay" role="dialog" aria-modal="true">
          <div className="shop-product-form__cropModal">
            <div className="shop-product-form__cropHeader">
              <h3>Encuadrar imagen</h3>
              <p>
                Ajusta el encuadre principal antes de añadir la imagen al producto.
              </p>
            </div>

            <div className="shop-product-form__cropPreview">
              <div className="shop-product-form__cropFrame">
                <img
                  src={cropState.previewUrl}
                  alt="Vista previa del recorte"
                  className="shop-product-form__cropImage"
                  style={cropPreviewStyle || undefined}
                />
              </div>
            </div>

            <div className="shop-product-form__cropControls">
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.2"
                  step="0.01"
                  value={cropState.zoom}
                  onChange={(event) =>
                    setCropState((current) =>
                      current ? { ...current, zoom: Number(event.target.value) } : current
                    )
                  }
                />
              </label>

              <label>
                Mover horizontal
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={cropState.offsetX}
                  onChange={(event) =>
                    setCropState((current) =>
                      current ? { ...current, offsetX: Number(event.target.value) } : current
                    )
                  }
                />
              </label>

              <label>
                Mover vertical
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={cropState.offsetY}
                  onChange={(event) =>
                    setCropState((current) =>
                      current ? { ...current, offsetY: Number(event.target.value) } : current
                    )
                  }
                />
              </label>
            </div>

            <div className="shop-product-form__cropActions">
              <button type="button" className="admin-action admin-action--ghost" onClick={handleCropCancel}>
                Cancelar
              </button>
              <button type="button" className="admin-btn-primary" onClick={handleCropConfirm} disabled={cropState.processing}>
                {cropState.processing ? "Aplicando..." : "Usar este recorte"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
