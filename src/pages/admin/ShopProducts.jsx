import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ShopProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          { data: productsData, error: productsError },
          { data: relationsData, error: relationsError },
          { data: categoriesData, error: categoriesError },
          { data: imagesData, error: imagesError },
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

        const normalized = (productsData || []).map((item) => ({
          ...item,
          categories: categoryNamesByProductId[item.id] || [],
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
      const sessionData = await supabase.auth.getSession();

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

      {loading ? <p>Cargando...</p> : null}
      {!loading && items.length === 0 ? <p>No hay productos cargados.</p> : null}

      {!loading ? (
        <div className="grid">
          {items.map((item) => (
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