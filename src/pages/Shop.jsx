import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import "../styles/shop.scss";

const CATEGORY_PRESETS = {
  mujer: {
    title: "Mujer",
    subtitle: "Moda, bolsos y zapatos",
    collectionLabel: "Nueva temporada",
    accent: "rose",
  },
  hombre: {
    title: "Hombre",
    subtitle: "Ropa, zapatillas y moda casual",
    collectionLabel: "Básicos",
    accent: "stone",
  },
  bebes: {
    title: "Bebé",
    subtitle: "Ropa, canastillas y primeras puestas",
    collectionLabel: "Bebé",
    accent: "sky",
  },
  "infantil-juvenil": {
    title: "Infantil",
    subtitle: "Ropa y calzado infantil",
    collectionLabel: "Moda infantil",
    accent: "sky",
  },
  hogar: {
    title: "Hogar",
    subtitle: "Textiles y detalles para casa",
    collectionLabel: "Textil hogar",
    accent: "linen",
  },
  otros: {
    title: "Otros",
    subtitle: "Hilos, costura y pequeños artículos",
    collectionLabel: "Otros",
    accent: "rose",
  },
  outlet: {
    title: "Outlet",
    subtitle: "Remates y oportunidades",
    collectionLabel: "Outlet",
    accent: "stone",
  },
};

const CATEGORY_IMAGES = {
  mujer: "/images/mujer.png",
  hombre: "/images/hombre.png",
  bebes: "/images/bebe.png",
  "infantil-juvenil": "/images/infantil-juvenil.png",
  hogar: "/images/hogar.png",
};

const FALLBACK_CATEGORIES = [
  { slug: "mujer", name: "Mujer", description: "Moda, bolsos y zapatos" },
  { slug: "hombre", name: "Hombre", description: "Ropa, zapatillas y moda casual" },
  { slug: "bebes", name: "Bebé", description: "Ropa, canastillas y primeras puestas" },
  { slug: "hogar", name: "Hogar", description: "Textiles y detalles para casa" },
  {
    slug: "infantil-juvenil",
    name: "Infantil-Juvenil",
    description: "Ropa y calzado infantil",
  },
  { slug: "otros", name: "Otros", description: "Hilos, costura y pequeños artículos" },
  { slug: "outlet", name: "Outlet", description: "Remates y oportunidades" },
];

const HOME_CATEGORIES = [
  {
    slug: "mujer",
    name: "Mujer",
    description: "Moda, bolsos y zapatos",
    accent: "rose",
    imageUrl: "/images/mujer.png",
  },
  {
    slug: "hombre",
    name: "Hombre",
    description: "Ropa, zapatillas y moda casual",
    accent: "stone",
    imageUrl: "/images/hombre.png",
  },
  {
    slug: "bebes",
    name: "Bebé",
    description: "Ropa, canastillas y primeras puestas",
    accent: "sky",
    imageUrl: "/images/bebe.png",
  },
  {
    slug: "infantil-juvenil",
    name: "Infantil y juvenil",
    description: "Ropa y calzado infantil",
    accent: "sky",
    imageUrl: "/images/infantil-juvenil.png",
  },
  {
    slug: "hogar",
    name: "Hogar",
    description: "Textiles y detalles para casa",
    accent: "linen",
    imageUrl: "/images/hogar.png",
  },
  {
    slug: "outlet",
    name: "Outlet",
    description: "Últimas unidades y oportunidades",
    accent: "sale",
    imageUrl: "/images/outlet.png",
  },
];

const COPY = {
  categoriesTitle: "Categorías",
  productsTitle: "Novedades destacadas",
  loading: "Cargando catálogo...",
  empty: "Todavía no hay productos cargados.",
  unavailable: "Imagen pendiente",
  cta: "Ver producto",
};

function normalizeCategory(raw) {
  const preset = CATEGORY_PRESETS[raw.slug] || {};

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name || preset.title || raw.slug,
    description: raw.description || preset.subtitle || "",
    accent: preset.accent || "rose",
    collectionLabel: preset.collectionLabel || raw.name || raw.slug,
    sortOrder: raw.sort_order || 0,
    imageUrl: CATEGORY_IMAGES[raw.slug] || "",
  };
}

export default function Shop() {
  useSeo({
    title: "Bolboretas & Valu | Tienda online de ropa y complementos",
    description:
      "Descubre ropa, complementos y textil hogar en Bolboretas & Valu. Colecciones para mujer, hombre, bebé, infantil y hogar.",
    path: "/tienda",
  });

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredStart, setFeaturedStart] = useState(0);
  const [featuredVisibleCount, setFeaturedVisibleCount] = useState(1);
  const [featuredLimit, setFeaturedLimit] = useState(8);
  const [featuredDirection, setFeaturedDirection] = useState("forward");

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [
          { data: categoriesData, error: categoriesError },
          { data: productsData, error: productsError },
        ] = await Promise.all([
          supabase
            .from("shop_categories")
            .select("id, slug, name, description, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("shop_products")
            .select(`
              id,
              slug,
              sku,
              name,
              description,
              price_eur,
              is_pack,
              is_active,
              created_at,
              shop_product_images (
                image_url,
                sort_order
              ),
              shop_product_categories (
                category_id,
                shop_categories (
                  id,
                  slug,
                  name,
                  description,
                  sort_order
                )
              )
            `)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
        ]);

        if (categoriesError) throw categoriesError;
        if (productsError) throw productsError;

        const normalizedCategories = (categoriesData || []).map(normalizeCategory);

        const normalizedProducts = (productsData || []).map((product) => {
          const sortedImages = [...(product.shop_product_images || [])].sort(
            (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
          );

          const productCategories = (product.shop_product_categories || [])
            .map((row) => row.shop_categories)
            .filter(Boolean)
            .map(normalizeCategory);

          const firstCategory = productCategories[0] || null;

          return {
            id: product.id,
            slug: product.slug,
            sku: product.sku,
            name: product.name,
            description: product.description || "",
            price: Number(product.price_eur || 0),
            isPack: Boolean(product.is_pack),
            imageUrl: sortedImages[0]?.image_url || "",
            images: sortedImages.map((img) => img.image_url),
            categories: productCategories,
            categoryName: firstCategory?.name || "Sin categoría",
            accent: firstCategory?.accent || "rose",
          };
        });

        if (!cancelled) {
          setCategories(normalizedCategories.length ? normalizedCategories : FALLBACK_CATEGORIES);
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error("Error al cargar la tienda:", error);
        if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShop();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function syncFeaturedVisibleCount() {
      if (window.innerWidth >= 1440) {
        setFeaturedVisibleCount(4);
        setFeaturedLimit(8);
        return;
      }

      if (window.innerWidth >= 900) {
        setFeaturedVisibleCount(3);
        setFeaturedLimit(8);
        return;
      }

      if (window.innerWidth >= 600) {
        setFeaturedVisibleCount(2);
        setFeaturedLimit(8);
        return;
      }

      setFeaturedVisibleCount(1);
      setFeaturedLimit(4);
    }

    syncFeaturedVisibleCount();
    window.addEventListener("resize", syncFeaturedVisibleCount);

    return () => window.removeEventListener("resize", syncFeaturedVisibleCount);
  }, []);

  const featuredProducts = useMemo(
    () => products.slice(0, featuredLimit),
    [products, featuredLimit]
  );
  const maxFeaturedStart = useMemo(
    () => Math.max(0, featuredProducts.length - featuredVisibleCount),
    [featuredProducts.length, featuredVisibleCount]
  );
  const visibleFeaturedProducts = useMemo(
    () => featuredProducts.slice(featuredStart, featuredStart + featuredVisibleCount),
    [featuredProducts, featuredStart, featuredVisibleCount]
  );
  useEffect(() => {
    setFeaturedStart((current) => Math.min(current, maxFeaturedStart));
  }, [maxFeaturedStart]);

  function handleFeaturedStep(direction) {
    setFeaturedDirection(direction > 0 ? "forward" : "backward");
    setFeaturedStart((current) => {
      if (direction > 0) {
        return current >= maxFeaturedStart ? 0 : Math.min(current + 1, maxFeaturedStart);
      }

      return current <= 0 ? maxFeaturedStart : Math.max(current - 1, 0);
    });
  }

  return (
    <main className="shop">
      <div className="shop__container">
        <header className="shop__hero reveal-on-scroll" style={{ "--reveal-delay": "40ms" }}>
          <img
            src="/images/logo.png"
            alt="Bolboretas & Valu"
            className="shop__heroLogo"
          />
        </header>

        <section
          className="shop__section reveal-on-scroll"
          id="categorias"
          style={{ "--reveal-delay": "80ms" }}
        >
          <div className="shop__heading">
            <span />
            <h2>{COPY.categoriesTitle}</h2>
            <span />
          </div>

          <div className="shop__categoryGrid">
            {HOME_CATEGORIES.map((category, index) => (
              <Link
                key={category.slug}
                to={`/categoria/${category.slug}`}
                className={`shop__categoryCard shop__categoryCard--${category.slug} reveal-on-scroll`}
                style={{ "--reveal-delay": `${120 + index * 60}ms` }}
              >
                <div className="shop__categoryImage">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="shop__categoryImg"
                    />
                  ) : (
                    <div className="shop__categoryPlaceholder">{category.name}</div>
                  )}
                </div>

                <div className="shop__categoryBody">
                  <h3>{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="shop__section reveal-on-scroll"
          id="destacados"
          style={{ "--reveal-delay": "140ms" }}
        >
          <div className="shop__heading">
            <span />
            <h2>{COPY.productsTitle}</h2>
            <span />
          </div>

          {loading ? <p className="shop__status">{COPY.loading}</p> : null}
          {!loading && featuredProducts.length === 0 ? (
            <p className="shop__status">{COPY.empty}</p>
          ) : null}

          <div className="shop__productCarousel">
            {featuredProducts.length > featuredVisibleCount ? (
              <button
                type="button"
                className="shop__carouselButton shop__carouselButton--prev"
                onClick={() => handleFeaturedStep(-1)}
                aria-label="Productos destacados anteriores"
              >
                ‹
              </button>
            ) : null}

            <div
              key={`${featuredDirection}-${featuredStart}`}
              className={`shop__productRail shop__productRail--${featuredDirection}`}
            >
              {visibleFeaturedProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="shop__productCard reveal-on-scroll"
                  style={{ "--reveal-delay": `${180 + index * 70}ms` }}
                >
                  <div className={`shop__productMedia shop__productMedia--${product.accent}`}>
                    <div className="shop__productMediaFrame">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="shop__productImg"
                        />
                      ) : (
                        <div className="shop__productPlaceholder">
                          <span>{product.categoryName}</span>
                          <strong>{COPY.unavailable}</strong>
                        </div>
                      )}
                    </div>
                    <div className="shop__productMediaGlow" aria-hidden="true" />
                  </div>

                  <div className="shop__productBody">
                    <h3>{product.name}</h3>
                    <p className="shop__productText">{product.description}</p>

                    <div className="shop__productFooter">
                      <div className="shop__productActions">
                        <Link
                          to={`/producto/${product.slug}`}
                          state={{ backTo: "/tienda" }}
                          className="shop__cta"
                        >
                          {COPY.cta}
                        </Link>
                      </div>
                      <p className="shop__productPrice">
                        {product.price.toFixed(2).replace(".", ",")} €
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {featuredProducts.length > featuredVisibleCount ? (
              <button
                type="button"
                className="shop__carouselButton shop__carouselButton--next"
                onClick={() => handleFeaturedStep(1)}
                aria-label="Productos destacados siguientes"
              >
                ›
              </button>
            ) : null}
          </div>
        </section>

      </div>
    </main>
  );
}
