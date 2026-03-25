import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/categoryPage.scss";

function slugifyValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_SUBCATEGORY_FALLBACKS = {
  mujer: [
    "Calzado",
    "Lencería",
    "Camisetas",
    "Pantalones",
    "Conjuntos",
    "Gorros",
    "Bufandas",
    "Calcetines",
    "Medias",
    "Pijamas",
    "Bañadores",
    "Bolsos",
    "Jerséis",
    "Chaquetas",
  ],
  hombre: ["Camisetas", "Pantalones", "Sudaderas", "Zapatillas", "Complementos"],
  bebes: ["Primera puesta", "Canastilla", "Pijamas", "Conjuntos", "Complementos"],
  "infantil-juvenil": ["Camisetas", "Pantalones", "Vestidos", "Calzado", "Abrigos"],
  hogar: ["Toallas", "Sábanas", "Mantelería", "Decoración", "Textil"],
  outlet: ["Últimas unidades", "Oportunidades"],
};

export default function CategoryPage() {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryPage() {
      try {
        const { data: categoryData, error: categoryError } = await supabase
          .from("shop_categories")
          .select("id, slug, name, description")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (categoryError) throw categoryError;
        if (cancelled) return;

        setCategory(categoryData);

        const { data: productsData, error: productsError } = await supabase
          .from("shop_products")
          .select(`
            id,
            slug,
            name,
            description,
            price_eur,
            shop_product_images (
              image_url,
              sort_order
            ),
            shop_product_categories (
              category_id,
              shop_categories (
                slug,
                name
              )
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (productsError) throw productsError;

        let subcategoriesData = [];
        let productSubcategoryRows = [];

        try {
          const [{ data: subcategoryRows }, { data: productSubcategoryData }] = await Promise.all([
            supabase
              .from("shop_subcategories")
              .select("id, category_id, slug, name, sort_order")
              .eq("category_id", categoryData.id)
              .eq("is_active", true)
              .order("sort_order", { ascending: true }),
            supabase
              .from("shop_product_subcategories")
              .select(`
                product_id,
                subcategory_id,
                shop_subcategories (
                  id,
                  slug,
                  name,
                  category_id
                )
              `),
          ]);

          subcategoriesData = subcategoryRows || [];
          productSubcategoryRows = productSubcategoryData || [];
        } catch (error) {
          console.warn("Aviso al cargar subcategorías de la categoría:", error.message);
        }

        const subcategoriesByProductId = {};
        productSubcategoryRows.forEach((row) => {
          const subcategory = row.shop_subcategories;
          if (!subcategory || subcategory.category_id !== categoryData.id) return;

          if (!subcategoriesByProductId[row.product_id]) {
            subcategoriesByProductId[row.product_id] = [];
          }

          subcategoriesByProductId[row.product_id].push(subcategory);
        });

        const normalizedProducts = (productsData || [])
          .filter((product) =>
            (product.shop_product_categories || []).some(
              (relation) => relation.shop_categories?.slug === slug
            )
          )
          .map((product) => {
            const sortedImages = [...(product.shop_product_images || [])].sort(
              (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
            );

            return {
              id: product.id,
              slug: product.slug,
              name: product.name,
              description: product.description || "",
              price: Number(product.price_eur || 0),
              imageUrl: sortedImages[0]?.image_url || "",
              subcategories: subcategoriesByProductId[product.id] || [],
            };
          });

        if (!cancelled) {
          setSubcategories(subcategoriesData);
          setProducts(normalizedProducts);
          setSelectedSubcategory(subcategoriesData.length > 0 ? "" : "all");
        }
      } catch (error) {
        console.error("Error en la página de categoría:", error);
        if (!cancelled) {
          setCategory(null);
          setProducts([]);
          setSubcategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategoryPage();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const visibleProducts = useMemo(() => {
    if (selectedSubcategory === "") return [];
    if (selectedSubcategory === "all") return products;

    return products.filter((product) =>
      product.subcategories.some((subcategory) => subcategory.slug === selectedSubcategory)
    );
  }, [products, selectedSubcategory]);

  const filterOptions = useMemo(() => {
    if (subcategories.length > 0) {
      return subcategories.map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: subcategory.name,
      }));
    }

    return (CATEGORY_SUBCATEGORY_FALLBACKS[slug] || []).map((name) => ({
      id: slugifyValue(name),
      slug: slugifyValue(name),
      name,
    }));
  }, [slug, subcategories]);

  const activeSubcategory = useMemo(
    () => filterOptions.find((subcategory) => subcategory.slug === selectedSubcategory) || null,
    [filterOptions, selectedSubcategory]
  );

  if (loading) {
    return (
      <main className="category-page">
        <div className="category-page__container">
          <p>Cargando categoría...</p>
        </div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="category-page">
        <div className="category-page__container">
          <p>Categoría no encontrada.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="category-page">
      <div className="category-page__container">
        <header className="category-page__header">
          <p className="category-page__breadcrumb">
            {category.name}
            {selectedSubcategory === "all" ? " > Todo" : ""}
            {activeSubcategory ? ` > ${activeSubcategory.name}` : ""}
          </p>
          <h1>{category.name}</h1>
          <p className="category-page__subtitle">Explora por subcategoría</p>
        </header>

        {filterOptions.length > 0 ? (
          <div className="category-page__filtersWrap">
            <div className="category-page__filters">
              <button
                type="button"
                className={`category-page__filter ${selectedSubcategory === "all" ? "is-active" : ""}`}
                onClick={() => setSelectedSubcategory("all")}
              >
                Todo
              </button>

              {filterOptions.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  className={`category-page__filter ${
                    selectedSubcategory === subcategory.slug ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedSubcategory(subcategory.slug)}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSubcategory === "" ? (
          <p className="category-page__prompt">
            Elige una subcategoría para empezar a ver productos.
          </p>
        ) : null}

        {visibleProducts.length === 0 ? (
          <p className="category-page__empty">No hay productos en esta sección todavía.</p>
        ) : (
          <div className="category-page__grid">
            {visibleProducts.map((product) => (
              <article key={product.id} className="category-page__card">
                <Link to={`/producto/${product.slug}`} className="category-page__imageWrap">
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : null}
                </Link>
                <div className="category-page__body">
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>

                  <div className="category-page__footer">
                    <Link to={`/producto/${product.slug}`} className="category-page__cta">
                      Ver producto
                    </Link>
                    <p className="category-page__price">
                      {product.price.toFixed(2).replace(".", ",")} €
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
