import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSeo } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import "../styles/categoryPage.scss";

const PRODUCTS_PER_PAGE = 10;
const CATEGORY_SKELETON_CARDS = Array.from({ length: PRODUCTS_PER_PAGE }, (_, index) => index);
const CATEGORY_SKELETON_FILTERS = Array.from({ length: 6 }, (_, index) => index);





export default function CategoryPage() {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryPage() {
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }

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
        let subcategoriesErrorMessage = "";
        let productSubcategoriesErrorMessage = "";

    const [
  { data: subcategoryRows, error: subcategoryRowsError },
  { data: productSubcategoryData, error: productSubcategoryDataError },
] = await Promise.all([
  supabase
    .from("shop_subcategories")
    .select("id, category_id, slug, name, sort_order")
    .eq("category_id", categoryData.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true }),
  supabase
    .from("shop_product_subcategories")
    .select("product_id, subcategory_id"),
]);

subcategoriesData = subcategoryRows || [];
productSubcategoryRows = productSubcategoryData || [];
subcategoriesErrorMessage = subcategoryRowsError?.message || "";
productSubcategoriesErrorMessage = productSubcategoryDataError?.message || "";

        const subcategoryMap = {};
        (subcategoriesData || []).forEach((subcategory) => {
          subcategoryMap[subcategory.id] = subcategory;
        });


        const subcategoriesByProductId = {};
        (productSubcategoryRows || []).forEach((row) => {
          const subcategory = subcategoryMap[row.subcategory_id];
          if (!subcategory) return;

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
          setSelectedSubcategoryId("all");
        }
      } catch (error) {
        console.error("Error en la pagina de categoria:", error);
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
    if (selectedSubcategoryId === "") return [];
    if (selectedSubcategoryId === "all") return products;

    return products.filter((product) =>
      product.subcategories.some(
        (subcategory) => subcategory.id === selectedSubcategoryId
      )
    );
  }, [products, selectedSubcategoryId]);

  const filterOptions = useMemo(() => {
    return subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
    }));
  }, [subcategories]);

  const activeSubcategory = useMemo(
    () =>
      filterOptions.find(
        (subcategory) => subcategory.id === selectedSubcategoryId
      ) || null,
    [filterOptions, selectedSubcategoryId]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE)),
    [visibleProducts.length]
  );

  useSeo({
    title: category?.name
      ? `${category.name} | Bolboretas & Valu`
      : "Categoría | Bolboretas & Valu",
    description:
      category?.description ||
      (category?.name
        ? `Explora la categoría ${category.name} en Bolboretas & Valu.`
        : "Explora nuestras categorías de tienda en Bolboretas & Valu."),
    path: slug ? `/categoria/${slug}` : "/tienda",
  });

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return visibleProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [currentPage, visibleProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [slug, selectedSubcategoryId]);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <main className="category-page category-page--loading" aria-busy="true">
        <div className="category-page__container">
          <header className="category-page__header">
            <div className="category-page__skeleton category-page__skeleton--breadcrumb" />
            <div className="category-page__skeleton category-page__skeleton--title" />
            <div className="category-page__skeleton category-page__skeleton--subtitle" />
          </header>

          <div className="category-page__filtersWrap">
            <div className="category-page__filters">
              <div className="category-page__skeleton category-page__skeleton--filter" />
              {CATEGORY_SKELETON_FILTERS.map((item) => (
                <div
                  key={item}
                  className="category-page__skeleton category-page__skeleton--filter"
                />
              ))}
            </div>
          </div>

          <div className="category-page__grid">
            {CATEGORY_SKELETON_CARDS.map((item) => (
              <article key={item} className="category-page__card category-page__card--skeleton">
                <div className="category-page__imageWrap category-page__imageWrap--skeleton" />

                <div className="category-page__body">
                  <div className="category-page__skeleton category-page__skeleton--cardTitle" />
                  <div className="category-page__skeleton category-page__skeleton--cardText" />
                  <div className="category-page__skeleton category-page__skeleton--cardText category-page__skeleton--cardTextShort" />

                  <div className="category-page__footer">
                    <div className="category-page__skeleton category-page__skeleton--cta" />
                    <div className="category-page__skeleton category-page__skeleton--price" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="category-page">
        <div className="category-page__container">
          <p>Categoria no encontrada.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="category-page">
      <div className="category-page__container">
        <header
          className="category-page__header reveal-on-scroll"
          style={{ "--reveal-delay": "40ms" }}
        >

          <p className="category-page__breadcrumb">
            {category.name}
            {selectedSubcategoryId === "all" ? " > Todo" : ""}
            {activeSubcategory ? ` > ${activeSubcategory.name}` : ""}
          </p>
          <h1>{category.name}</h1>
          <p className="category-page__subtitle">Explora por subcategoria</p>
        </header>
        <pre style={{ fontSize: "12px", padding: "8px", background: "#f5f5f5" }}>
          {JSON.stringify({
            subcategories: subcategories.length,
            products: products.length,
            filterOptions: filterOptions.length,
            productsWithSubcategories: products.filter(
              (product) => product.subcategories.length > 0
            ).length,
            firstProductSubcategories: products[0]?.subcategories || [],
            subcategoriesErrorMessage,
productSubcategoriesErrorMessage,
          }, null, 2)}
        </pre>
        {filterOptions.length > 0 ? (
          <div
            className="category-page__filtersWrap reveal-on-scroll"
            style={{ "--reveal-delay": "100ms" }}
          >
            <div className="category-page__filters">
              <button
                type="button"
                className={`category-page__filter ${selectedSubcategoryId === "all" ? "is-active" : ""}`}
                onClick={() => setSelectedSubcategoryId("all")}
              >
                Todo
              </button>

              {filterOptions.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  className={`category-page__filter ${selectedSubcategoryId === subcategory.id ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedSubcategoryId(subcategory.id);
                  }}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {visibleProducts.length === 0 ? (
          <p className="category-page__empty">No hay productos en esta seccion todavia.</p>
        ) : (
          <>
            <div className="category-page__grid">
              {paginatedProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="category-page__card reveal-on-scroll"
                  style={{ "--reveal-delay": `${140 + index * 45}ms` }}
                >
                  <Link
                    to={`/producto/${product.slug}`}
                    state={{ backTo: `/categoria/${slug}` }}
                    className="category-page__imageWrap"
                  >
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : null}
                  </Link>

                  <div className="category-page__body">
                    <h2>{product.name}</h2>
                    <p>{product.description}</p>

                    <div className="category-page__footer">
                      <Link
                        to={`/producto/${product.slug}`}
                        state={{ backTo: `/categoria/${slug}` }}
                        className="category-page__cta"
                      >
                        Ver producto
                      </Link>
                      <p className="category-page__price">
                        {product.price.toFixed(2).replace(".", ",")} EUR
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 ? (
              <nav
                className="category-page__pagination reveal-on-scroll"
                aria-label="Paginacion de productos"
                style={{ "--reveal-delay": "220ms" }}
              >
                <button
                  type="button"
                  className="category-page__pageBtn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>

                <div className="category-page__pageNumbers">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;

                    return (
                      <button
                        key={page}
                        type="button"
                        className={`category-page__pageBtn ${currentPage === page ? "is-active" : ""
                          }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="category-page__pageBtn"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
