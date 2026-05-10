import React from "react";
import { Link } from "react-router-dom";
import "./footer.scss";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <h3>Información</h3>
          <Link to="/quienes-somos">Sobre nosotros</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/privacidad">Privacidad</Link>
        </div>

        <div className="site-footer__col">
          <h3>Envíos y devoluciones</h3>
          <p>Envío gratis a partir de 60 EUR</p>
          <Link to="/politica-de-devoluciones">Política de devoluciones</Link>
        </div>

        <div className="site-footer__col">
          <h3>Síguenos</h3>
          <div className="site-footer__socials">
            <a
              //href="https://www.instagram.com/bolboretas_valu/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <img src="/images/icons/instagram.png" alt="Logo Instagram" />
            </a>
            <a
              //href="https://www.facebook.com/share/1QA1uKWLWj/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <img src="/images/icons/facebook.png" alt="Logo Facebook" />
            </a>
            <a
             // href="https://tiktok.com/@cristinabolboretas"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <img src="/images/icons/tik-tok.png" alt="Logo TikTok" />
            </a>
            <a
              //href="https://www.threads.com/@bolboretas_valu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Threads"
            >
              <img src="/images/icons/treads.png" alt="Logo Threads" />
            </a>
          </div>
        </div>
      </div>

      <div className="site-footer__credit">
        <p>
          ¿Necesitas una web para tu negocio?{" "}
          <a href="mailto:app.animavet@gmail.com">Hablemos.</a>
        </p>
      </div>
    </footer>
  );
}
