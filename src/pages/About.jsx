import React from "react";
import "../styles/about.scss";

export default function About() {
  return (
    <main className="container about">
      <section className="about-hero reveal-on-scroll" style={{ "--reveal-delay": "60ms" }}>
        <p className="about-claim">Moda, hogar y detalles con sensibilidad propia.</p>
        <p className="about-intro">
          Bolboretas & Valu es una tienda online centrada en ropa, complementos y textil
          para mujer, hombre, bebes, infantil-juvenil y hogar.
        </p>

        <img
          src="/images/logo.png"
          alt="Bolboretas & Valu"
          className="about-image"
        />
        <p className="about-caption">
          Selección y atención cercana para construir un catalogo cuidado.
        </p>
      </section>

      <section className="about-section reveal-on-scroll" style={{ "--reveal-delay": "140ms" }}>
        <h2>Que ofrecemos</h2>
        <p>
          La tienda se organiza por categorias claras para que la propietaria pueda
          gestionar el catalogo con autonomia y mantener cada seccion actualizada.
        </p>
        <p>
          Ademas del producto publicado, cada ficha permite recibir peticiones directas
          por talla, prenda o variante similar.
        </p>
      </section>

      <section className="about-section reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
        <h2>Nuestra forma de trabajar</h2>
        <ul className="about-list">
          <li>
            <strong>Catalogo ordenado</strong>
            <p>Categorias base para crecer sin mezclar colecciones ni tipos de producto.</p>
          </li>

          <li>
            <strong>Atencion directa</strong>
            <p>
              Formulario bajo cada producto para resolver necesidades concretas sin perder
              el contexto del articulo.
            </p>
          </li>

          <li>
            <strong>Gestion sencilla</strong>
            <p>
              La propietaria podra cargar producto real desde el panel que se prepare para
              la tienda.
            </p>
          </li>
        </ul>
      </section>
    </main>
  );
}
