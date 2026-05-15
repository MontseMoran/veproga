import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cartContext";
import { useSeo } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import "../styles/shop.scss";

const CATEGORY_PRESETS = {
  animales: {
    title: "Animales",
    subtitle: "Piensos, higiene y material ganadero",
    collectionLabel: "Para tus animales",
    heroTitle: "Cuidado para tus animales",
    heroCta: "Comprar para animales",
    accent: "earth",
    tone: "brown",
  },
  cultivo: {
    title: "Huerta y cultivo",
    subtitle: "Semillas, abonos, sustratos y riego",
    collectionLabel: "Para tu huerta",
    heroTitle: "Cultiva tu huerta",
    heroCta: "Ver productos de huerta",
    accent: "green",
    tone: "olive",
  },
  jardin: {
    title: "Jardín y plantas",
    subtitle: "Ornamentales, árboles y sustratos",
    collectionLabel: "Para tu huerta",
    heroTitle: "Jardín y plantas",
    heroCta: "Explorar jardín",
    accent: "forest",
    tone: "sand",
  },
  tratamientos: {
    title: "Tratamientos",
    subtitle: "Fitosanitarios y soluciones específicas",
    collectionLabel: "Soluciones técnicas",
    heroTitle: "Protección y tratamiento",
    heroCta: "Ver tratamientos",
    accent: "slate",
    tone: "blue",
  },
  herramientas: {
    title: "Herramientas",
    subtitle: "Accesorios y mantenimiento diario",
    collectionLabel: "Para mantenimiento",
    heroTitle: "Herramientas y mantenimiento",
    heroCta: "Ver herramientas",
    accent: "earth",
    tone: "charcoal",
  },
  ofertas: {
    title: "Ofertas",
    subtitle: "Promociones activas y liquidación",
    collectionLabel: "Ofertas",
    heroTitle: "Aprovecha las ofertas",
    heroCta: "Ver descuentos",
    accent: "sale",
    tone: "sale",
  },
};

const FALLBACK_CATEGORIES = [
  {
    id: "animales",
    slug: "animales",
    name: "Animales",
    description: "Piensos, higiene y material ganadero",
    sortOrder: 1,
  },
  {
    id: "cultivo",
    slug: "cultivo",
    name: "Huerta y cultivo",
    description: "Semillas, abonos, sustratos y riego",
    sortOrder: 2,
  },
  {
    id: "jardin",
    slug: "jardin",
    name: "Jardín y plantas",
    description: "Ornamentales, árboles y sustratos",
    sortOrder: 3,
  },
  {
    id: "herramientas",
    slug: "herramientas",
    name: "Herramientas",
    description: "Accesorios y mantenimiento diario",
    sortOrder: 4,
  },
  {
    id: "tratamientos",
    slug: "tratamientos",
    name: "Tratamientos",
    description: "Fitosanitarios y soluciones específicas",
    sortOrder: 5,
  },
  {
    id: "ofertas",
    slug: "ofertas",
    name: "Ofertas",
    description: "Promociones activas y liquidación",
    sortOrder: 6,
  },
];

const FALLBACK_SUBCATEGORIES = {
  animales: ["Perros", "Gatos", "Caballos", "Vacas", "Gallinas"],
  cultivo: ["Semillas", "Abonos", "Sustratos", "Fitosanitarios"],
  jardin: ["Ornamentales", "Árboles", "Macetas", "Sustratos"],
  herramientas: ["Guantes", "Herramientas manuales", "Accesorios"],
  tratamientos: ["Fungicidas", "Herbicidas", "Insecticidas"],
  ofertas: ["Destacados", "Liquidación"],
};

const HERO_CATEGORY_ORDER = ["animales", "cultivo"];
const TABS_CATEGORY_ORDER = ["animales", "cultivo", "jardin", "herramientas", "tratamientos"];

const PROMO_STRIPS = [
  { value: "50%", label: "Dto.", slug: "ofertas", tone: "red" },
  { value: "20%", label: "Dto.", slug: "tratamientos", tone: "amber" },
  { value: "10%", label: "Dto.", slug: "jardin", tone: "green" },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 16l4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
      <path
        d="M3 4h2l2.1 10.1a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H7.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s6-4.8 6-11a6 6 0 1 0-12 0c0 6.2 6 11 6 11z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.5 4.5h2.8l1.2 3.5-1.8 1.8a16 16 0 0 0 4.2 4.2l1.8-1.8 3.5 1.2v2.8a1.5 1.5 0 0 1-1.7 1.5A15 15 0 0 1 6 6.2 1.5 1.5 0 0 1 7.5 4.5z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 14.5c1.8-2.4 6.2-2.4 8 0 1.4 1.8.5 4.5-2 4.5H10c-2.5 0-3.4-2.7-2-4.5z"
        fill="currentColor"
      />
      <circle cx="7" cy="9" r="1.8" fill="currentColor" />
      <circle cx="11" cy="7" r="1.8" fill="currentColor" />
      <circle cx="15" cy="7" r="1.8" fill="currentColor" />
      <circle cx="19" cy="9" r="1.8" fill="currentColor" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 4c-7 .2-12 3.9-14 10.8-.5 1.8-.7 3.4-.8 5.2 1.8-.1 3.4-.3 5.2-.8C17.1 17 20.8 12 21 5a1 1 0 0 0-1-1z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 16c2.6-3.6 6-6.4 10-8.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FlowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
      <circle cx="12" cy="6.5" r="2.6" fill="currentColor" />
      <circle cx="17.5" cy="12" r="2.6" fill="currentColor" />
      <circle cx="12" cy="17.5" r="2.6" fill="currentColor" />
      <circle cx="6.5" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 4l6 6-2 2-6-6 2-2zm-7.2 5.8 7.4 7.4-3.2 3.2-7.4-7.4 3.2-3.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 5-3 8.4-7 10-4-1.6-7-5-7-10V6l7-3z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.2 12.2l1.8 1.8 3.8-4.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13 4H6a2 2 0 0 0-2 2v7l8.5 8.5a2.1 2.1 0 0 0 3 0l6-6a2.1 2.1 0 0 0 0-3L13 4z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function getCategoryIcon(slug) {
  switch (slug) {
    case "animales":
      return <PawIcon />;
    case "cultivo":
      return <LeafIcon />;
    case "jardin":
      return <FlowerIcon />;
    case "herramientas":
      return <ToolsIcon />;
    case "tratamientos":
      return <ShieldIcon />;
    case "ofertas":
      return <TagIcon />;
    default:
      return <LeafIcon />;
  }
}

function normalizeCategory(raw) {
  const preset = CATEGORY_PRESETS[raw.slug] || {};

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name || preset.title || raw.slug,
    description: raw.description || preset.subtitle || "",
    sortOrder: Number(raw.sort_order || 0),
    accent: preset.accent || "earth",
    tone: preset.tone || "brown",
    heroTitle: preset.heroTitle || raw.name || "Veproga",
    heroCta: preset.heroCta || "Ver categoría",
    collectionLabel: preset.collectionLabel || raw.name || raw.slug,
  };
}

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
}

function getProductImage(product) {
  return product.imageUrl || "";
}

function getCategoryImage(products, slug) {
  const matchingProduct = products.find((product) =>
    product.categories.some((category) => category.slug === slug)
  );

  return matchingProduct?.imageUrl || "";
}

function buildSidebarSections(categories, subcategoriesBySlug) {
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    items:
      subcategoriesBySlug[category.slug]?.length > 0
        ? subcategoriesBySlug[category.slug]
        : (FALLBACK_SUBCATEGORIES[category.slug] || []).map((name, index) => ({
            id: `${category.slug}-${index}`,
            name,
            slug: "",
          })),
  }));
}

export default function Shop() {
  const { addItem, itemCount } = useCart();

  useSeo({
    title: "Veproga | Productos zoosanitarios y agrotienda online",
    description:
      "Compra productos para animales, huerta, jardín, tratamientos y ofertas en Veproga.",
    path: "/tienda",
  });

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES.map(normalizeCategory));
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

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
          { data: subcategoriesData, error: subcategoriesError },
          { data: productsData, error: productsError },
        ] = await Promise.all([
          supabase
            .from("shop_categories")
            .select("id, slug, name, description, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("shop_subcategories")
            .select("id, category_id, slug, name, sort_order")
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
              is_heavy_shipping,
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
        if (subcategoriesError) {
          console.warn("Aviso al cargar subcategorías de la portada:", subcategoriesError.message);
        }

        const normalizedCategories = (categoriesData || []).map(normalizeCategory);

        const normalizedProducts = (productsData || []).map((product) => {
          const sortedImages = [...(product.shop_product_images || [])].sort(
            (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
          );

          const productCategories = (product.shop_product_categories || [])
            .map((row) => row.shop_categories)
            .filter(Boolean)
            .map(normalizeCategory);

          return {
            id: product.id,
            slug: product.slug,
            sku: product.sku || "",
            name: product.name,
            description: product.description || "",
            price: Number(product.price_eur || 0),
            isPack: Boolean(product.is_pack),
            isHeavyShipping: Boolean(product.is_heavy_shipping),
            imageUrl: sortedImages[0]?.image_url || "",
            categories: productCategories,
            primaryCategory: productCategories[0] || null,
          };
        });

        if (!cancelled) {
          setCategories(
            normalizedCategories.length
              ? normalizedCategories
              : FALLBACK_CATEGORIES.map(normalizeCategory)
          );
          setSubcategories(subcategoriesError ? [] : subcategoriesData || []);
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error("Error al cargar la tienda:", error);

        if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES.map(normalizeCategory));
          setSubcategories([]);
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

  const searchValue = deferredSearchQuery.trim().toLowerCase();

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories]
  );

  const subcategoriesBySlug = useMemo(() => {
    return subcategories.reduce((accumulator, subcategory) => {
      const category = categoriesById[subcategory.category_id];
      if (!category) return accumulator;

      if (!accumulator[category.slug]) {
        accumulator[category.slug] = [];
      }

      accumulator[category.slug].push({
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug || "",
      });

      return accumulator;
    }, {});
  }, [categoriesById, subcategories]);

  const orderedCategories = useMemo(() => {
    const allCategories = categories.length
      ? categories
      : FALLBACK_CATEGORIES.map(normalizeCategory);

    return [...allCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  const searchFilteredProducts = useMemo(() => {
    if (!searchValue) return products;

    return products.filter((product) => {
      const haystack = [
        product.name,
        product.description,
        product.primaryCategory?.name,
        ...product.categories.map((category) => category.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchValue);
    });
  }, [products, searchValue]);

  const featuredProducts = useMemo(
    () => searchFilteredProducts.slice(0, 4),
    [searchFilteredProducts]
  );

  const topProducts = useMemo(
    () => searchFilteredProducts.slice(0, 3),
    [searchFilteredProducts]
  );

  const heroCategories = useMemo(() => {
    const lookup = Object.fromEntries(orderedCategories.map((category) => [category.slug, category]));

    return HERO_CATEGORY_ORDER.map(
      (slug) => lookup[slug] || normalizeCategory(FALLBACK_CATEGORIES.find((item) => item.slug === slug))
    ).filter(Boolean);
  }, [orderedCategories]);

  const tabCategories = useMemo(() => {
    const lookup = Object.fromEntries(orderedCategories.map((category) => [category.slug, category]));

    return TABS_CATEGORY_ORDER.map(
      (slug) => lookup[slug] || normalizeCategory(FALLBACK_CATEGORIES.find((item) => item.slug === slug))
    ).filter(Boolean);
  }, [orderedCategories]);

  const sidebarSections = useMemo(
    () => buildSidebarSections(tabCategories, subcategoriesBySlug),
    [subcategoriesBySlug, tabCategories]
  );

  function handleQuickAdd(product) {
    addItem({
      id: product.id,
      lineId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      isHeavyShipping: product.isHeavyShipping,
      categorySlug: product.primaryCategory?.slug || "",
      categoryName: product.primaryCategory?.name || "",
      variantId: "",
      variantSku: product.sku || "",
    });
  }

  return (
    <main className="shop">
      <div className="shop__shell">
        <section className="shop__board">
            <header className="shop__masthead reveal-on-scroll" style={{ "--reveal-delay": "40ms" }}>
              <Link to="/tienda" className="shop__brand" aria-label="Veproga">
                <span className="shop__brandWordmark">VEPROGA</span>
                <img src="/images/logo.png" alt="Veproga" className="shop__brandLogo" />
              </Link>

            <form className="shop__search" role="search" onSubmit={(event) => event.preventDefault()}>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar productos, animales, cultivos..."
                aria-label="Buscar productos"
              />
              <button type="submit" aria-label="Buscar">
                <SearchIcon />
              </button>
            </form>

            <div className="shop__tools" aria-label="Accesos rápidos">
              <Link to="/carrito" className="shop__tool shop__tool--cart">
                <CartIcon />
                <span>Mi carrito</span>
                {itemCount > 0 ? <strong>{itemCount}</strong> : null}
              </Link>

              <Link to="/contacto" className="shop__tool">
                <PinIcon />
                <span>Contactanos</span>
              </Link>

              <Link to="/contacto" className="shop__tool">
                <PhoneIcon />
                <span>Envio gratis a partir de 60€</span>
              </Link>
            </div>
          </header>

          <div className="shop__layout">
            <aside className="shop__sidebar reveal-on-scroll" style={{ "--reveal-delay": "90ms" }}>
              {sidebarSections.map((section) => (
                <div key={section.slug} className="shop__sidebarSection">
                  <Link to={`/categoria/${section.slug}`} className="shop__sidebarHeading">
                    <span className="shop__sidebarIcon">{getCategoryIcon(section.slug)}</span>
                    <span>{section.name}</span>
                  </Link>

                  <div className="shop__sidebarLinks">
                    {section.items.map((item) => (
                      <Link key={item.id || item.name} to={`/categoria/${section.slug}`} className="shop__sidebarLink">
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </aside>

            <div className="shop__content">
              <section className="shop__hero reveal-on-scroll" style={{ "--reveal-delay": "120ms" }}>
                {heroCategories.map((category) => {
                  const heroImage = getCategoryImage(products, category.slug);

                  return (
                    <article
                      key={category.slug}
                      className={`shop__heroCard shop__heroCard--${category.tone}`}
                    >
                      {heroImage ? (
                        <img src={heroImage} alt={category.name} className="shop__heroImage" />
                      ) : (
                        <div className="shop__heroFallback" aria-hidden="true" />
                      )}

                      <div className="shop__heroOverlay" />
                      <div className="shop__heroBody">
                        <p>{category.name}</p>
                        <h1>{category.heroTitle}</h1>
                        <Link to={`/categoria/${category.slug}`} className="shop__heroCta">
                          {category.heroCta}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </section>

              <nav className="shop__tabs reveal-on-scroll" style={{ "--reveal-delay": "150ms" }}>
                {tabCategories.map((category) => (
                  <Link
                    key={category.slug}
                    to={`/categoria/${category.slug}`}
                    className={`shop__tab shop__tab--${category.accent}`}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>

              <section className="shop__featured reveal-on-scroll" style={{ "--reveal-delay": "180ms" }}>
                <div className="shop__sectionHeader">
                  <h2>Productos Destacados</h2>
                  {searchValue ? <p>Resultados para "{searchQuery}"</p> : <p>Selección rápida de la tienda</p>}
                </div>

                {loading ? <p className="shop__status">Cargando catálogo...</p> : null}
                {!loading && featuredProducts.length === 0 ? (
                  <p className="shop__status">No hay productos que coincidan con la búsqueda.</p>
                ) : null}

                {!loading && featuredProducts.length > 0 ? (
                  <div className="shop__featuredList">
                    {featuredProducts.map((product) => (
                      <article key={product.id} className="shop__featuredItem">
                        <Link to={`/producto/${product.slug}`} className="shop__featuredImageLink">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)} alt={product.name} className="shop__featuredImage" />
                          ) : (
                            <div className="shop__featuredPlaceholder">Imagen pendiente</div>
                          )}
                        </Link>

                        <div className="shop__featuredInfo">
                          <h3>{product.name}</h3>
                          <p>{product.description || product.primaryCategory?.description || "Producto destacado de Veproga."}</p>
                        </div>

                        <p className="shop__featuredPrice">{formatPrice(product.price)}</p>

                        <button type="button" className="shop__addButton" onClick={() => handleQuickAdd(product)}>
                          Añadir
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="shop__promo reveal-on-scroll" style={{ "--reveal-delay": "210ms" }}>
                {PROMO_STRIPS.map((promo) => (
                  <Link
                    key={promo.value}
                    to={`/categoria/${promo.slug}`}
                    className={`shop__promoCard shop__promoCard--${promo.tone}`}
                  >
                    <strong>{promo.value}</strong>
                    <span>{promo.label}</span>
                  </Link>
                ))}
              </section>

              <section className="shop__collections reveal-on-scroll" style={{ "--reveal-delay": "240ms" }}>
                {topProducts.map((product, index) => {
                  const category = product.primaryCategory || tabCategories[index] || orderedCategories[index];
                  const title = category?.collectionLabel || "Selección Veproga";

                  return (
                    <article key={product.id} className="shop__collectionCard">
                      {getProductImage(product) ? (
                        <img src={getProductImage(product)} alt={title} className="shop__collectionImage" />
                      ) : (
                        <div className="shop__collectionFallback" aria-hidden="true" />
                      )}

                      <div className="shop__collectionTop">
                        <span>{title}</span>
                      </div>

                      <div className="shop__collectionBottom">
                        <h3>{product.name}</h3>
                        <Link to={`/producto/${product.slug}`}>Ver producto</Link>
                      </div>
                    </article>
                  );
                })}
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
