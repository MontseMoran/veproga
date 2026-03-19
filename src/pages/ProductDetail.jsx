import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ShopRequestForm from "../components/ShopRequestForm/ShopRequestForm";
import { supabase } from "../lib/supabaseClient";
import "../styles/productDetail.scss";

export default function ProductDetail() {
  const { slug } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");

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
            shop_product_images (
              image_url,
              sort_order
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

        const normalizedProduct = {
          id: data.id,
          slug: data.slug,
          sku: data.sku,
          name: data.name,
          description: data.description || "",
          price: Number(data.price_eur || 0),
          isPack: Boolean(data.is_pack),
          images: sortedImages,
          categoryName: categories[0]?.name || "Sin categoria",
          categories,
        };

        if (!cancelled) {
          setProduct(normalizedProduct);
          setActiveImage(sortedImages[0] || "");
        }
      } catch (error) {
        console.error("Product detail error:", error);
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
      <div className="product-detail__container">
        <section className="product-detail__grid">
          <div className="product-detail__gallery">
            <div className="product-detail__mainImage">
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

          <div className="product-detail__content">
            <p className="product-detail__category">{product.categoryName}</p>
            <h1>{product.name}</h1>
            <p className="product-detail__price">
              {product.price.toFixed(2).replace(".", ",")} €
            </p>
            <p className="product-detail__description">{product.description}</p>

            <div className="product-detail__request">
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