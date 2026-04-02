import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import BackLink from "../components/backLink/BackLink";
import ShopRequestForm from "../components/ShopRequestForm/ShopRequestForm";
import { useCart } from "../lib/cartContext";
import { supabase } from "../lib/supabaseClient";
import "../styles/productDetail.scss";

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildVariantKey(color, size) {
  return `${String(color || "").trim()}::${String(size || "").trim()}`;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
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
            shop_product_images (
              image_url,
              sort_order
            ),
            shop_product_variants (
              id,
              color,
              size,
              price_eur,
              is_active,
              sku
            ),
            shop_product_categories (
              shop_categories (
                id,
                slug,
                name
              )
            )
          `)
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (error) throw error;

        const sortedImages = [...(data.shop_product_images || [])]
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((img) => img.image_url)
          .filter(Boolean);

        const categories = (data.shop_product_categories || [])
          .map((row) => row.shop_categories)
          .filter(Boolean);

        const variants = (data.shop_product_variants || []).map((variant) => ({
          id: variant.id,
          color: String(variant.color || "").trim(),
          size: String(variant.size || "").trim(),
          price:
            variant.price_eur === null || variant.price_eur === undefined
              ? null
              : Number(variant.price_eur),
          is_active: Boolean(variant.is_active),
          sku: String(variant.sku || "").trim(),
        }));

        const normalizedProduct = {
          id: data.id,
          slug: data.slug,
          sku: data.sku,
          name: data.name,
          description: data.description || "",
          price: Number(data.price_eur || 0),
          isPack: Boolean(data.is_pack),
          isHeavyShipping: Boolean(data.is_heavy_shipping),
          images: sortedImages,
          variants,
          categoryName: categories[0]?.name || "Sin categoría",
          categories,
        };

        if (!cancelled) {
          setProduct(normalizedProduct);
          setActiveImage(sortedImages[0] || "");
          setQuantity(1);
          setAddedMsg("");
          setSelectedColor("");
          setSelectedSize("");
        }
      } catch (error) {
        console.error("Error en la ficha de producto:", error);
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasImages = useMemo(() => product?.images?.length > 0, [product]);

  const activeImageIndex = useMemo(() => {
    if (!product?.images?.length) return -1;
    return Math.max(0, product.images.findIndex((image) => image === activeImage));
  }, [activeImage, product?.images]);

  const allColors = useMemo(
    () => uniqueValues((product?.variants || []).map((variant) => variant.color)),
    [product?.variants]
  );

  const allSizes = useMemo(
    () => uniqueValues((product?.variants || []).map((variant) => variant.size)),
    [product?.variants]
  );

  const activeVariants = useMemo(
    () => (product?.variants || []).filter((variant) => variant.is_active),
    [product?.variants]
  );

  const colorOptions = useMemo(
    () =>
      allColors.map((color) => ({
        label: color,
        isAvailable: activeVariants.some((variant) => variant.color === color),
      })),
    [activeVariants, allColors]
  );

  const sizeOptions = useMemo(
    () =>
      allSizes.map((size) => {
        const relatedVariants = activeVariants.filter(
          (variant) =>
            variant.size === size && (!selectedColor || variant.color === selectedColor)
        );

        return {
          label: size,
          isAvailable: relatedVariants.some((variant) => variant.is_active),
        };
      }),
    [activeVariants, allSizes, selectedColor]
  );

  const availableSizesForSelection = useMemo(
    () =>
      uniqueValues(
        activeVariants
          .filter((variant) => !selectedColor || variant.color === selectedColor)
          .map((variant) => variant.size)
      ),
    [activeVariants, selectedColor]
  );

  const activeVariant = useMemo(() => {
    if (!selectedColor && !selectedSize) return null;

    return (
      (product?.variants || []).find(
        (variant) =>
          variant.is_active &&
          variant.color === selectedColor &&
          variant.size === selectedSize
      ) || null
    );
  }, [product?.variants, selectedColor, selectedSize]);

  const requiresColorSelection = colorOptions.length > 1;
  const requiresSizeSelection = allSizes.length > 0;
  const displayedPrice = activeVariant?.price ?? product?.price ?? 0;
  const backTo = location.state?.backTo || (product?.categories?.[0]?.slug
    ? `/categoria/${product.categories[0].slug}`
    : "/tienda");

  useEffect(() => {
    if (colorOptions.length !== 1) return;
    if (!colorOptions[0]?.isAvailable) return;

    const onlyColor = colorOptions[0].label;
    if (selectedColor !== onlyColor) {
      setSelectedColor(onlyColor);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (!requiresSizeSelection) return;

    if (availableSizesForSelection.length === 1) {
      const onlySize = availableSizesForSelection[0];

      if (selectedSize !== onlySize) {
        setSelectedSize(onlySize);
      }

      return;
    }

    if (selectedSize && !availableSizesForSelection.includes(selectedSize)) {
      setSelectedSize("");
    }
  }, [
    availableSizesForSelection,
    requiresSizeSelection,
    selectedSize,
  ]);

  function handleChangeImage(direction) {
    if (!product?.images?.length) return;

    const nextIndex =
      (activeImageIndex + direction + product.images.length) % product.images.length;
    setActiveImage(product.images[nextIndex]);
  }

  function handleSelectColor(color) {
    const nextColor = selectedColor === color ? "" : color;
    const nextAvailableSizes = uniqueValues(
      activeVariants
        .filter((variant) => !nextColor || variant.color === nextColor)
        .map((variant) => variant.size)
    );

    setSelectedColor(nextColor);

    if (nextAvailableSizes.length === 1) {
      setSelectedSize(nextAvailableSizes[0]);
    } else if (selectedSize && !nextAvailableSizes.includes(selectedSize)) {
      setSelectedSize("");
    }

    setAddedMsg("");
  }

  function handleSelectSize(size, isAvailable) {
    if (!isAvailable) return;
    setSelectedSize((current) => (current === size ? "" : size));
    setAddedMsg("");
  }

  function handleAddToCart() {
    if (!product) return;

    if (requiresColorSelection && !selectedColor) {
      setAddedMsg("Selecciona un color.");
      return;
    }

    if (requiresSizeSelection && !selectedSize) {
      setAddedMsg("Selecciona una talla.");
      return;
    }

    if (requiresColorSelection && requiresSizeSelection && !activeVariant) {
      setAddedMsg("Esa combinación no está disponible.");
      return;
    }

    addItem(
      {
        id: product.id,
        lineId: [
          product.id,
          selectedColor || "sin-color",
          selectedSize || "sin-talla",
        ].join("::"),
        slug: product.slug,
        name: product.name,
        price: displayedPrice,
        imageUrl: product.images[0] || "",
        isHeavyShipping: product.isHeavyShipping,
        categorySlug: product.categories?.[0]?.slug || "",
        categoryName: product.categories?.[0]?.name || product.categoryName || "",
        color: selectedColor || "",
        size: selectedSize || "",
        variantId: activeVariant?.id || "",
        variantSku: activeVariant?.sku || "",
      },
      quantity
    );

    setAddedMsg("Añadido al carrito.");
  }

  if (loading) {
    return (
      <main className="product-detail">
        <div className="product-detail__container">
          <p>Cargando producto...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-detail">
        <div className="product-detail__container">
          <p>Producto no encontrado.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="product-detail">
      <div className="product-detail__back">
        <BackLink to={backTo} />
      </div>

      <div className="product-detail__container">
        <section className="product-detail__grid">
          <div
            className="product-detail__gallery reveal-on-scroll"
            style={{ "--reveal-delay": "40ms" }}
          >
            <div className="product-detail__mainImage">
              {product.images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="product-detail__imageNav product-detail__imageNav--prev"
                    onClick={() => handleChangeImage(-1)}
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="product-detail__imageNav product-detail__imageNav--next"
                    onClick={() => handleChangeImage(1)}
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </>
              ) : null}

              {activeImage ? (
                <img src={activeImage} alt={product.name} />
              ) : (
                <div className="product-detail__placeholder">Imagen no disponible</div>
              )}
            </div>

            {hasImages && (
              <div className="product-detail__thumbs">
                {product.images.map((image, index) => (
                  <button
                    key={image || index}
                    type="button"
                    className={`product-detail__thumb ${
                      activeImage === image ? "is-active" : ""
                    }`}
                    onClick={() => setActiveImage(image)}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="product-detail__content reveal-on-scroll"
            style={{ "--reveal-delay": "120ms" }}
          >
            <p className="product-detail__category">{product.categoryName}</p>
            <h1>{product.name}</h1>
            <p className="product-detail__price">
              {displayedPrice.toFixed(2).replace(".", ",")} €
            </p>

            {colorOptions.length > 0 ? (
              <div className="product-detail__options">
                <p className="product-detail__optionTitle">Colores</p>
                <div className="product-detail__chips">
                  {colorOptions.map((color) => (
                    <button
                      key={color.label}
                      type="button"
                      className={`product-detail__chip ${
                        selectedColor === color.label ? "is-active" : ""
                      } ${color.isAvailable ? "" : "is-disabled"}`}
                      onClick={() => handleSelectColor(color.label)}
                      disabled={!color.isAvailable}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {sizeOptions.length > 0 ? (
              <div className="product-detail__options">
                <p className="product-detail__optionTitle">Tallas</p>
                <div className="product-detail__chips">
                  {sizeOptions.map((size) => (
                    <button
                      key={buildVariantKey(selectedColor, size.label)}
                      type="button"
                      className={`product-detail__chip ${
                        selectedSize === size.label ? "is-active" : ""
                      } ${size.isAvailable ? "" : "is-disabled"}`}
                      onClick={() => handleSelectSize(size.label, size.isAvailable)}
                      disabled={!size.isAvailable}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {(selectedColor || selectedSize) && (
              <p className="product-detail__selection">
                {selectedColor ? `Color: ${selectedColor}` : null}
                {selectedColor && selectedSize ? " · " : null}
                {selectedSize ? `Talla: ${selectedSize}` : null}
              </p>
            )}

            <div className="product-detail__purchase">
              <label className="product-detail__quantity">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(Math.max(1, Number(event.target.value) || 1));
                    setAddedMsg("");
                  }}
                />
              </label>

              <button
                type="button"
                className="product-detail__addToCart"
                onClick={handleAddToCart}
              >
                Añadir al carrito
              </button>
            </div>
            {addedMsg ? <p className="product-detail__addedMsg">{addedMsg}</p> : null}
            <p className="product-detail__description">{product.description}</p>

            <div
              className="product-detail__request reveal-on-scroll"
              style={{ "--reveal-delay": "200ms" }}
            >
              <ShopRequestForm
                product={product}
                categoryName={product.categoryName}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
