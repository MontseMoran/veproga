import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../../lib/cartContext";
import "./nav.scss";

const categoryLinks = [
  { to: "/categoria/mujer", label: "Mujer" },
  { to: "/categoria/hombre", label: "Hombre" },
  { to: "/categoria/bebes", label: "Bebé" },
  { to: "/categoria/infantil-juvenil", label: "Infantil-Juvenil" },
  { to: "/categoria/hogar", label: "Hogar" },
  { to: "/categoria/otros", label: "Otros" },
  { to: "/categoria/outlet", label: "Outlet" },
];

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="18" cy="20" r="1.25" />
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.76L21 7H7.4" />
    </svg>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { itemCount } = useCart();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="nav">
      <div className="nav-inner">
        
        <Link to="/" className="brand" aria-label="Bolboretas & Valu">
          <img
            src="/images/logo.png"
            alt="Bolboretas & Valu"
            className="brand-logo"
          />
        </Link>

        <button
          className={`hamburger ${open ? "is-open" : ""}`}
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <nav id="main-menu" className={`links ${open ? "open" : ""}`}>
          <div className="links-inner">
            {categoryLinks.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className="nav-item"
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="nav-icons" aria-label="Acciones">
          <Link
            to="/carrito"
            className="nav-iconLink"
            aria-label="Ver carrito"
          >
            <CartIcon />
            {itemCount > 0 ? <span className="nav-cartCount">{itemCount}</span> : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
