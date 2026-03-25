import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cartContext";
import { supabase } from "../lib/supabaseClient";
import "../styles/cart.scss";

export default function Cart() {
  const {
    items,
    subtotal,
    discountAmount,
    total,
    appliedDiscount,
    updateQuantity,
    removeItem,
    clearCart,
    applyDiscount,
    clearDiscount,
  } = useCart();

  const [code, setCode] = useState(appliedDiscount?.code || "");
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    setCode(appliedDiscount?.code || "");
  }, [appliedDiscount?.code]);

  async function handleApplyDiscount(event) {
    event.preventDefault();
    setDiscountMsg("");
    setDiscountError("");

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setDiscountError("Introduce un código de descuento.");
      return;
    }

    setCheckingCode(true);

    const { data, error } = await supabase
      .from("shop_discount_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    setCheckingCode(false);

    if (error) {
      setDiscountError("No se pudo validar el código ahora mismo.");
      return;
    }

    if (!data) {
      setDiscountError("Ese código no existe.");
      return;
    }

    if (!data.is_active) {
      setDiscountError("Ese código no está activo.");
      return;
    }

    const validFrom = data.valid_from ? new Date(data.valid_from).getTime() : null;
    const validUntil = data.valid_until ? new Date(data.valid_until).getTime() : null;
    const now = Date.now();

    if (validFrom && Number.isFinite(validFrom) && now < validFrom) {
      setDiscountError("Ese código todavía no está disponible.");
      return;
    }

    if (validUntil && Number.isFinite(validUntil) && now > validUntil) {
      setDiscountError("Ese código ya ha caducado.");
      return;
    }

    if (subtotal < Number(data.min_order_amount || 0)) {
      setDiscountError(
        `Este código requiere un pedido mínimo de ${Number(data.min_order_amount || 0)
          .toFixed(2)
          .replace(".", ",")} €.`
      );
      return;
    }

    if (
      data.usage_limit &&
      Number(data.usage_limit) > 0 &&
      Number(data.times_used || 0) >= Number(data.usage_limit)
    ) {
      setDiscountError("Ese código ya ha agotado sus usos.");
      return;
    }

    applyDiscount(data);
    setDiscountMsg("Código aplicado correctamente.");
  }

  return (
    <main className="cart-page">
      <div className="cart-page__container">
        <header className="cart-page__header reveal-on-scroll" style={{ "--reveal-delay": "40ms" }}>
          <h1>Carrito</h1>
          <div className="cart-page__headerActions">
            <Link to="/tienda" className="cart-page__continue cart-page__continue--ghost">
              Seguir comprando
            </Link>

            {items.length > 0 ? (
              <button type="button" className="cart-page__clear" onClick={clearCart}>
                Vaciar carrito
              </button>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="cart-page__empty reveal-on-scroll" style={{ "--reveal-delay": "100ms" }}>
            <p>Tu carrito está vacío.</p>
            <Link to="/tienda" className="cart-page__continue">
              Seguir comprando
            </Link>
          </div>
        ) : (
          <section className="cart-page__layout">
            <div className="cart-page__list">
              {items.map((item, index) => (
                <article
                  key={item.lineId || item.id}
                  className="cart-page__item reveal-on-scroll"
                  style={{ "--reveal-delay": `${100 + index * 50}ms` }}
                >
                  <Link to={`/producto/${item.slug}`} className="cart-page__imageWrap">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : null}
                  </Link>

                  <div className="cart-page__itemBody">
                    <Link to={`/producto/${item.slug}`} className="cart-page__name">
                      {item.name}
                    </Link>

                    {item.color || item.size ? (
                      <p className="cart-page__meta">
                        {item.color ? `Color: ${item.color}` : null}
                        {item.color && item.size ? " · " : null}
                        {item.size ? `Talla: ${item.size}` : null}
                      </p>
                    ) : null}

                    <p className="cart-page__price">
                      {item.price.toFixed(2).replace(".", ",")} €
                    </p>

                    <div className="cart-page__controls">
                      <label className="cart-page__qty">
                        <span>Cantidad</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateQuantity(item.lineId || item.id, event.target.value)
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="cart-page__remove"
                        onClick={() => removeItem(item.lineId || item.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <p className="cart-page__lineTotal">
                    {(item.price * item.quantity).toFixed(2).replace(".", ",")} €
                  </p>
                </article>
              ))}
            </div>

            <aside
              className="cart-page__summary reveal-on-scroll"
              style={{ "--reveal-delay": "140ms" }}
            >
              <form className="cart-page__discount" onSubmit={handleApplyDiscount}>
                <label htmlFor="cart-discount-code" className="cart-page__summaryLabel">
                  Código de descuento
                </label>

                <div className="cart-page__discountRow">
                  <input
                    id="cart-discount-code"
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Escribe tu código"
                  />
                  <button type="submit" className="cart-page__discountBtn" disabled={checkingCode}>
                    {checkingCode ? "Comprobando..." : "Aplicar"}
                  </button>
                </div>

                {discountError ? (
                  <p className="cart-page__discountMsg cart-page__discountMsg--error">
                    {discountError}
                  </p>
                ) : null}

                {discountMsg ? <p className="cart-page__discountMsg">{discountMsg}</p> : null}

                {appliedDiscount ? (
                  <div className="cart-page__appliedDiscount">
                    <p>
                      <strong>{appliedDiscount.code}</strong>
                      {appliedDiscount.description ? ` · ${appliedDiscount.description}` : ""}
                    </p>
                    <button type="button" onClick={clearDiscount}>
                      Quitar
                    </button>
                  </div>
                ) : null}
              </form>

              <div className="cart-page__summaryRows">
                <div className="cart-page__summaryRow">
                  <p className="cart-page__summaryLabel">Subtotal</p>
                  <p className="cart-page__summaryNumber">
                    {subtotal.toFixed(2).replace(".", ",")} €
                  </p>
                </div>

                {discountAmount > 0 ? (
                  <div className="cart-page__summaryRow cart-page__summaryRow--discount">
                    <p className="cart-page__summaryLabel">Descuento</p>
                    <p className="cart-page__summaryNumber">
                      -{discountAmount.toFixed(2).replace(".", ",")} €
                    </p>
                  </div>
                ) : null}
              </div>

              <p className="cart-page__summaryLabel">Total</p>
              <p className="cart-page__summaryValue">
                {total.toFixed(2).replace(".", ",")} €
              </p>
              <p className="cart-page__summaryText">
                La compra online todavía no está finalizada. Usa este carrito como
                preparación del pedido.
              </p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
