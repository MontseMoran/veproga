import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ShopProducts() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [subcategoriesReady, setSubcategoriesReady] = useState(true);
  const [loading, setLoading] = useState(true);

  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) {
      return subcategories;
    }

    return subcategories.filter((subcategory) => subcategory.category_id === selectedCategoryId);
  }, [selectedCategoryId, subcategories]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        !selectedCategoryId ||
        item.categoryIds.some((categoryId) => categoryId === selectedCategoryId);

      const matchesSubcategory =
        !selectedSubcategoryId ||
        item.subcategories.some((subcategory) => subcategory.id === selectedSubcategoryId);

      return matchesCategory && matchesSubcategory;
    });
  }, [items, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          { data: productsData, error: productsError },
          { data: relationsData, error: relationsError },
          { data: categoriesData, error: categoriesError },
          { data: imagesData, error: imagesError },
          { data: subcategoriesData, error: subcategoriesError },
          { data: productSubcategoriesData, error: productSubcategoriesError },
        ] = await Promise.all([
          supabase
            .from("shop_products")
            .select("id, sku, slug, name, description, price_eur, is_pack, is_active, created_at")
            .order("created_at", { ascending: false }),

          supabase.from("shop_product_categories").select("product_id, category_id"),

          supabase
            .from("shop_categories")
            .select("id, name, sort_order")
            .order("sort_order", { ascending: true }),

          supabase
            .from("shop_product_images")
            .select("product_id, image_url, sort_order")
            .order("sort_order", { ascending: true }),

          supabase
            .from("shop_subcategories")
            .select("id, category_id, name, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase.from("shop_product_subcategories").select("product_id, subcategory_id"),
        ]);

        if (productsError) throw productsError;
        if (relationsError) throw relationsError;
        if (categoriesError) throw categoriesError;
        if (imagesError) throw imagesError;

        const categoriesById = Object.fromEntries(
          (categoriesData || []).map((category) => [category.id, category])
        );

        const categoryNamesByProductId = {};
        (relationsData || []).forEach((row) => {
          if (!categoryNamesByProductId[row.product_id]) {
            categoryNamesByProductId[row.product_id] = [];
          }

          const category = categoriesById[row.category_id];
          if (category) {
            categoryNamesByProductId[row.product_id].push(category.name);
          }
        });

        const firstImageByProductId = {};
        (imagesData || []).forEach((row) => {
          if (!firstImageByProductId[row.product_id]) {
            firstImageByProductId[row.product_id] = row.image_url;
          }
        });

        const categoriesList = categoriesData || [];
        let subcategoriesList = [];
        let subcategoriesByProductId = {};

        if (subcategoriesError || productSubcategoriesError) {
          console.warn(
            "ShopProducts subcategories warning:",
            subcategoriesError?.message || productSubcategoriesError?.message
          );

          if (active) {
            setCategories(categoriesList);
            setSubcategories([]);
            setSubcategoriesReady(false);
            setSelectedCategoryId("");
            setSelectedSubcategoryId("");
          }
        } else {
          const subcategoriesById = Object.fromEntries(
            (subcategoriesData || []).map((subcategory) => [subcategory.id, subcategory])
          );

          subcategoriesList = subcategoriesData || [];
          subcategoriesByProductId = {};

          (productSubcategoriesData || []).forEach((row) => {
            const subcategory = subcategoriesById[row.subcategory_id];

            if (!subcategory) {
              return;
            }

            if (!subcategoriesByProductId[row.product_id]) {
              subcategoriesByProductId[row.product_id] = [];
            }

            subcategoriesByProductId[row.product_id].push(subcategory);
          });

          if (active) {
            setCategories(categoriesList);
            setSubcategories(subcategoriesList);
            setSubcategoriesReady(true);
          }
        }

        const normalized = (productsData || []).map((item) => ({
          ...item,
          categories: categoryNamesByProductId[item.id] || [],
          categoryIds: (relationsData || [])
            .filter((row) => row.product_id === item.id)
            .map((row) => row.category_id),
          subcategories: subcategoriesByProductId[item.id] || [],
          image_url: firstImageByProductId[item.id] || "",
        }));

        if (active) {
          setItems(normalized);
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setItems([]);
          setCategories([]);
          setSubcategories([]);
          setSubcategoriesReady(false);
          setSelectedCategoryId("");
          setSelectedSubcategoryId("");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id) {
    if (!confirm("Se borrará este producto.")) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("delete-product", {
        body: { productId: id },
      });

      if (error) throw error;

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <div>
      <h2>Productos</h2>

      <div className="admin-top-actions">
        <Link to="/admin/productos/nuevo" className="admin-action admin-action--primary">
          Nuevo producto
        </Link>
      </div>

      {!loading && categories.length > 0 ? (
        <div className="admin-filterBar">
          <label htmlFor="admin-products-category" className="admin-filterBar__label">
            Categoría
          </label>
          <select
            id="admin-products-category"
            className="admin-filterBar__select"
            value={selectedCategoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              setSelectedCategoryId(nextCategoryId);
              setSelectedSubcategoryId("");
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {subcategoriesReady && filteredSubcategories.length > 0 ? (
            <>
              <label htmlFor="admin-products-subcategory" className="admin-filterBar__label">
                Subcategoría
              </label>
              <select
                id="admin-products-subcategory"
                className="admin-filterBar__select"
                value={selectedSubcategoryId}
                onChange={(event) => setSelectedSubcategoryId(event.target.value)}
              >
                <option value="">
                  {selectedCategoryId
                    ? "Todas las subcategorías de esta categoría"
                    : "Todas las subcategorías"}
                </option>
                {filteredSubcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      ) : null}

      {!loading && !categories.length && subcategoriesReady && subcategories.length > 0 ? (
        <div className="admin-filterBar">
          <label htmlFor="admin-products-subcategory" className="admin-filterBar__label">
            Subcategoría
          </label>
          <select
            id="admin-products-subcategory"
            className="admin-filterBar__select"
            value={selectedSubcategoryId}
            onChange={(event) => setSelectedSubcategoryId(event.target.value)}
          >
            <option value="">Todas las subcategorías</option>
            {filteredSubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? <p>Cargando...</p> : null}
      {!loading && items.length === 0 ? <p>No hay productos cargados.</p> : null}
      {!loading && items.length > 0 && visibleItems.length === 0 ? (
        <p>No hay productos para esa subcategoría.</p>
      ) : null}

      {!loading ? (
        <div className="grid">
          {visibleItems.map((item) => (
            <div key={item.id} className="card">
              {item.image_url ? <img src={item.image_url} alt={item.name} /> : null}

              <h4>{item.name}</h4>

              <p>{item.description || "Sin descripción."}</p>

              <p>
                <strong>SKU:</strong> {item.sku || "Sin SKU"}
              </p>

              <p>
                <strong>Categorías:</strong>{" "}
                {item.categories.length > 0 ? item.categories.join(", ") : "Sin categoría"}
              </p>

              {item.subcategories.length > 0 ? (
                <p>
                  <strong>Subcategorías:</strong>{" "}
                  {item.subcategories.map((subcategory) => subcategory.name).join(", ")}
                </p>
              ) : null}

              <p>
                <strong>Precio:</strong>{" "}
                {item.price_eur ? `${Number(item.price_eur).toFixed(2)} EUR` : "Sin precio"}
              </p>

              <p>
                <strong>Tipo:</strong> {item.is_pack ? "Pack" : "Producto"}
              </p>

              <p>
                <strong>Estado:</strong> {item.is_active ? "Visible" : "Oculto"}
              </p>

              <div className="actions">
                <Link to={`/producto/${item.slug}`} className="admin-action admin-action--ghost">
                  Ver en web
                </Link>

                <Link
                  to={`/admin/productos/${item.id}/editar`}
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
