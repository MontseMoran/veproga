import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusLabel(value) {
  if (value === "pendiente") return "Pendiente";
  if (value === "pagado") return "Pagado";
  if (value === "enviado") return "Enviado";
  if (value === "entregado") return "Entregado";
  if (value === "cancelado") return "Cancelado";
  return value || "Sin estado";
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase.functions.invoke("admin-orders", {
          body: { action: "list" },
        });

        if (error) throw error;
        if (active) setOrders(data?.orders || []);
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
        if (active) setOrders([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = !statusFilter || order.status === statusFilter;

      const haystack = [
        order.reference,
        order.customer_name,
        order.email,
        order.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="admin-orders">
      <div className="admin-pageHeader">
        <div>
          <h2>Pedidos</h2>
          <p>Revisa pedidos, cambia su estado y entra al detalle para imprimir la etiqueta.</p>
        </div>
      </div>

      <div className="admin-filterBar">
        <label htmlFor="orders-status" className="admin-filterBar__label">
          Estado
        </label>
        <select
          id="orders-status"
          className="admin-filterBar__select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="enviado">Enviado</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <label htmlFor="orders-search" className="admin-filterBar__label">
          Buscar
        </label>
        <input
          id="orders-search"
          className="admin-filterBar__input"
          type="search"
          placeholder="Referencia, cliente, email o teléfono"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading ? <p>Cargando pedidos...</p> : null}
      {!loading && visibleOrders.length === 0 ? <p>No hay pedidos para ese filtro.</p> : null}

      {!loading && visibleOrders.length > 0 ? (
        <div className="admin-orderList">
          {visibleOrders.map((order) => (
            <article key={order.id} className="admin-orderCard">
              <div className="admin-orderCard__top">
                <div>
                  <p className="admin-orderCard__reference">{order.reference}</p>
                  <p className="admin-orderCard__date">{formatDate(order.created_at)}</p>
                </div>
                <span className={`admin-status admin-status--${order.status || "pendiente"}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="admin-orderCard__grid">
                <div>
                  <strong>Cliente</strong>
                  <p>{order.customer_name || "-"}</p>
                </div>
                <div>
                  <strong>Contacto</strong>
                  <p>{order.email || "-"}</p>
                  <p>{order.phone || "-"}</p>
                </div>
                <div>
                  <strong>Pago</strong>
                  <p>
                    {order.payment_method === "tienda"
                      ? "Pago en tienda"
                      : order.payment_method || "-"}
                  </p>
                </div>
                <div>
                  <strong>Total</strong>
                  <p>{formatPrice(order.total_eur)}</p>
                </div>
              </div>

              <div className="actions">
                <Link
                  to={`/admin/pedidos/${order.id}`}
                  className="admin-action admin-action--primary"
                >
                  Ver pedido
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
