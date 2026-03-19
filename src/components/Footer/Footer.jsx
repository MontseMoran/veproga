import React from "react";
import { Link } from "react-router-dom";
import "./footer.scss";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <h3>Informacion</h3>
          <a href="/#home">Home</a>
          <Link to="/quienes-somos">Sobre nosotros</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/privacidad">Privacidad</Link>
        </div>

        <div className="site-footer__col">
          <h3>Atencion al cliente</h3>
          <a href="mailto:info@bolboretasvalu.com">info@bolboretasvalu.com</a>
          <a href="/#destacados">Productos destacados</a>
          <a href="/#colecciones">Colecciones</a>
        </div>

        <div className="site-footer__col">
          <h3>Envios y devoluciones</h3>
          <p>Envio gratis a partir de 50 EUR</p>
          <p>Peticion directa por talla y variante</p>
          <p>Atencion personalizada</p>
        </div>

        <div className="site-footer__col">
          <h3>Siguenos</h3>
          <div className="site-footer__socials">
            <a
              href="https://www.instagram.com/bolboretas_valu/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <img src="/images/icons/instagram.png" alt="Logo Instagram" />
            </a>
            <a
              href="https://www.facebook.com/share/1QA1uKWLWj/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <img src="/images/icons/facebook.png" alt="Logo Facebook" />
            </a>
            <a
              href="https://tiktok.com/@cristinabolboretas"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <img src="/images/icons/tik-tok.png" alt="Logo Tiktok" />
            </a>
            <a
              href="https://www.threads.com/@bolboretas_valu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Threads"
            >
               <img src="/images/icons/treads.png" alt="Logo Treads" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
