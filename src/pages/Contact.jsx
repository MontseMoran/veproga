import React from "react";
import "../styles/contact.scss";

export default function Contact() {
  return (
    <main className="contact-page">
      <div className="container contact-page__content">
        <section className="card reveal-on-scroll" style={{ "--reveal-delay": "80ms" }}>
          <h2>Contacto directo</h2>
          <p className="muted">
            Si necesitas informacion sobre un producto, una categoria o una peticion
            especial, puedes escribirnos por aqui.
          </p>

          <p>
            <strong>Email</strong>{" "}
            <a href="mailto:info@bolboretasvalu.com">info@bolboretasvalu.com</a>
          </p>

          <p>
            <strong>Instagram</strong>{" "}
            <a
              href="https://www.instagram.com/bolboretasvalu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              @bolboretasvalu
            </a>
          </p>
        </section>

        <section className="card reveal-on-scroll" style={{ "--reveal-delay": "180ms" }}>
          <h2>Atencion personalizada</h2>
          <p className="muted">
            La tienda esta preparada para recibir consultas por talla, prenda o
            disponibilidad directamente desde cada producto.
          </p>

          <ul className="secondary-list">
            <li>Consulta primero el producto que mas se aproxime a lo que buscas.</li>
            <li>Usa el formulario situado debajo para indicar talla o variante.</li>
            <li>La propietaria revisara la solicitud y respondera segun disponibilidad.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
