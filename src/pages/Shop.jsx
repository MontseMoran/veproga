import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ShopRequestForm from "../components/ShopRequestForm/ShopRequestForm";
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
    collectionLabel: "Basicos",
    accent: "stone",
  },
  bebes: {
    title: "Bebé",
    subtitle: "Ropa, canastillas y primeras puestas",
    collectionLabel: "Bebé",
    accent: "sky",
  },
  infantil: {
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
    subtitle: "Hilos, costura y pequeños articulos",
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

const FALLBACK_CATEGORIES = [
  { slug: "mujer", name: "Mujer", description: "Moda, bolsos y zapatos" },
  { slug: "hombre", name: "Hombre", description: "Ropa, zapatillas y moda casual" },
  { slug: "bebes", name: "Bebé", description: "Ropa, canastillas y primeras puestas" },
  { slug: "hogar", name: "Hogar", description: "Textiles y detalles para casa" },
  { slug: "infantil", name: "Infantil", description: "Ropa y calzado infantil" },
  { slug: "otros", name: "Otros", description: "Hilos, costura y pequeños articulos" },
  { slug: "outlet", name: "Outlet", description: "Remates y oportunidades" },
];

const COPY = {
  categoriesTitle: "Secciones destacadas",
  productsTitle: "Novedades destacadas",
  collectionsTitle: "Descubre nuestras colecciones",
  loading: "Cargando catalogo...",
  empty: "Todavia no hay productos cargados.",
  unavailable: "Imagen pendiente",
  requestHint: "No encuentras lo que buscas?",
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
  };
}

function buildCategoryCards(categories, products) {
  const mainSlugs = ["mujer", "hombre", "bebes", "hogar"];

  return mainSlugs
    .map((slug) => {
      const category = categories.find((item) => item.slug === slug) || null;
      const imageUrl =
        products.find((item) => item.categories.some((cat) => cat.slug === slug))?.imageUrl || "";

      if (!category) return null;

      return {
        ...category,
        imageUrl,
      };
    })
    .filter(Boolean);
}

function buildCollectionCards(categories, products) {
  const collectionSlugs = ["infantil", "otros", "outlet"];

  return collectionSlugs
    .map((slug) => {
      const category = categories.find((item) => item.slug === slug) || null;
      const imageUrl =
        products.find((item) => item.categories.some((cat) => cat.slug === slug))?.imageUrl || "";

      if (!category) return null;

      return {
        slug: category.slug,
        label: category.collectionLabel,
        imageUrl,
      };
    })
    .filter(Boolean);
}

export default function Shop() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
            categoryName: firstCategory?.name || "Sin categoria",
            accent: firstCategory?.accent || "rose",
          };
        });

        if (!cancelled) {
          setCategories(normalizedCategories.length ? normalizedCategories : FALLBACK_CATEGORIES);
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error("Shop load error:", error);
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

  const categoryCards = useMemo(
    () => buildCategoryCards(categories, products),
    [categories, products]
  );

  const featuredProducts = useMemo(() => products.slice(0, 5), [products]);

  const collectionCards = useMemo(
    () => buildCollectionCards(categories, products),
    [categories, products]
  );

  return (
    <main className="shop">
      <div className="shop__container">
        <header className="shop__hero">
          <img
            src="/images/logo.png"
            alt="Bolboretas & Valu"
            className="shop__heroLogo"
          />
        </header>

        <section className="shop__section" id="categorias">
          <div className="shop__heading">
            <span />
            <h2>{COPY.categoriesTitle}</h2>
            <span />
          </div>

          <div className="shop__categoryGrid">
            {categoryCards.map((category) => (
              <Link
                key={category.slug}
                to={`/categoria/${category.slug}`}
                className={`shop__categoryCard shop__categoryCard--${category.accent}`}
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
                  <p>{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="shop__section" id="destacados">
          <div className="shop__heading">
            <span />
            <h2>{COPY.productsTitle}</h2>
            <span />
          </div>

          {loading ? <p className="shop__status">{COPY.loading}</p> : null}
          {!loading && featuredProducts.length === 0 ? (
            <p className="shop__status">{COPY.empty}</p>
          ) : null}

          <div className="shop__productRail">
            {featuredProducts.map((product) => (
              <article key={product.id} className="shop__productCard">
                <div className={`shop__productMedia shop__productMedia--${product.accent}`}>
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

                <div className="shop__productBody">
                  <h3>{product.name}</h3>
                  <p className="shop__productText">{product.description}</p>
                  <p className="shop__productPrice">
                    {product.price.toFixed(2).replace(".", ",")} €
                  </p>

                  <div className="shop__productActions">
                    <Link to={`/producto/${product.slug}`} className="shop__cta">
                      {COPY.cta}
                    </Link>
                  </div>
                </div>

                <div className="shop__requestWrap">
                  <p className="shop__requestHint">{COPY.requestHint}</p>
                  <ShopRequestForm
                    product={product}
                    categoryName={product.categoryName}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shop__section" id="colecciones">
          <div className="shop__heading">
            <span />
            <h2>{COPY.collectionsTitle}</h2>
            <span />
          </div>

          <div className="shop__collectionGrid">
            {collectionCards.map((collection) => (
              <Link
                key={collection.slug}
                to={`/categoria/${collection.slug}`}
                className="shop__collectionCard"
              >
                {collection.imageUrl ? (
                  <img
                    src={collection.imageUrl}
                    alt={collection.label}
                    className="shop__collectionImg"
                  />
                ) : (
                  <div className="shop__collectionFallback" />
                )}

                <div className="shop__collectionOverlay">{collection.label}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}