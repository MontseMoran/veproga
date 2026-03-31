import React from "react";
import "../styles/returnsPolicy.scss";

const RETURN_CONDITIONS = [
  "Estar en perfecto estado.",
  "No haber sido usado.",
  "Conservar su embalaje original, etiquetas y accesorios.",
  "No presentar daños causados por un uso inadecuado.",
];

const RETURN_REQUEST_FIELDS = [
  "Tu número de pedido.",
  "Tu nombre.",
  "Tu número de teléfono.",
  "El artículo que deseas devolver.",
];

export default function ReturnsPolicy() {
  return (
    <main className="container returns-policy">
      <section className="returns-policy__hero reveal-on-scroll" style={{ "--reveal-delay": "60ms" }}>
        <div className="returns-policy__copy">
          <p className="returns-policy__kicker reveal-on-scroll" style={{ "--reveal-delay": "90ms" }}>
            Envíos y devoluciones
          </p>
          <h1 className="returns-policy__title reveal-on-scroll" style={{ "--reveal-delay": "130ms" }}>
            Una política de devoluciones clara, cercana y sencilla.
          </h1>
          <p className="returns-policy__intro reveal-on-scroll" style={{ "--reveal-delay": "180ms" }}>
            Queremos que recibas tu pedido con ilusión y que te encante. Si al recibirlo
            no es lo que esperabas, aquí tienes toda la información para gestionarlo de
            forma fácil.
          </p>
        </div>

        <aside
          className="returns-policy__highlight reveal-on-scroll"
          style={{ "--reveal-delay": "220ms" }}
        >
          <p className="returns-policy__highlightEyebrow">Plazo de devolución</p>
          <h2>14 días naturales desde la recepción del pedido</h2>
          <p>
            Si necesitas tramitar una devolución, escríbenos y te indicaremos los pasos
            para hacerlo de la manera más sencilla posible.
          </p>
        </aside>
      </section>

      <section className="returns-policy__band reveal-on-scroll" style={{ "--reveal-delay": "140ms" }}>
        <div className="returns-policy__bandHeader">
          <p
            className="returns-policy__eyebrow reveal-on-scroll"
            style={{ "--reveal-delay": "170ms" }}
          >
            Condiciones
          </p>
          <h2 className="reveal-on-scroll" style={{ "--reveal-delay": "210ms" }}>
            Para devolver un artículo, el producto debe cumplir estos requisitos
          </h2>
        </div>

        <div className="returns-policy__bandContent">
          <ul className="returns-policy__list">
            {RETURN_CONDITIONS.map((condition, index) => (
              <li
                key={condition}
                className="reveal-on-scroll"
                style={{ "--reveal-delay": `${250 + index * 45}ms` }}
              >
                {condition}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="returns-policy__band reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
        <div className="returns-policy__bandHeader">
          <p
            className="returns-policy__eyebrow reveal-on-scroll"
            style={{ "--reveal-delay": "250ms" }}
          >
            Importante
          </p>
          <h2 className="reveal-on-scroll" style={{ "--reveal-delay": "290ms" }}>
            Algunos artículos no admiten devolución
          </h2>
        </div>

        <div className="returns-policy__bandContent">
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "330ms" }}>
            Al tratarse de productos artesanales, personalizados o hechos por encargo,
            algunos artículos no admiten devolución, especialmente si han sido creados o
            adaptados específicamente para ti.
          </p>
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "380ms" }}>
            La ropa interior no admite devolución.
          </p>
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "430ms" }}>
            Por motivos de higiene, los artículos personalizados o precintados no pueden
            devolverse una vez han sido desprecintados.
          </p>
        </div>
      </section>

      <section
        className="returns-policy__band returns-policy__band--process reveal-on-scroll"
        style={{ "--reveal-delay": "300ms" }}
      >
        <div className="returns-policy__bandHeader">
          <p
            className="returns-policy__eyebrow reveal-on-scroll"
            style={{ "--reveal-delay": "330ms" }}
          >
            Cómo solicitarla
          </p>
          <h2 className="reveal-on-scroll" style={{ "--reveal-delay": "370ms" }}>
            Escríbenos a nuestro email con estos datos
          </h2>
        </div>

        <div className="returns-policy__bandContent">
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "410ms" }}>
            Puedes solicitar tu devolución escribiendo a{" "}
            <a href="mailto:bolboretasvalu@gmail.com">bolboretasvalu@gmail.com</a>. Para
            agilizar el proceso, indícanos:
          </p>
          <ul className="returns-policy__list">
            {RETURN_REQUEST_FIELDS.map((field, index) => (
              <li
                key={field}
                className="reveal-on-scroll"
                style={{ "--reveal-delay": `${450 + index * 45}ms` }}
              >
                {field}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="returns-policy__band reveal-on-scroll" style={{ "--reveal-delay": "360ms" }}>
        <div className="returns-policy__bandHeader">
          <p
            className="returns-policy__eyebrow reveal-on-scroll"
            style={{ "--reveal-delay": "390ms" }}
          >
            Gastos de devolución
          </p>
          <h2 className="reveal-on-scroll" style={{ "--reveal-delay": "430ms" }}>
            Quién asume los costes
          </h2>
        </div>

        <div className="returns-policy__bandContent">
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "470ms" }}>
            Los gastos de envío de la devolución corren por cuenta del cliente.
          </p>
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "520ms" }}>
            Si el producto llega defectuoso o ha habido un error en el pedido, nos
            hacemos cargo de todo.
          </p>
        </div>
      </section>

      <section
        className="returns-policy__band returns-policy__band--closing reveal-on-scroll"
        style={{ "--reveal-delay": "420ms" }}
      >
        <div className="returns-policy__bandHeader">
          <p
            className="returns-policy__eyebrow reveal-on-scroll"
            style={{ "--reveal-delay": "450ms" }}
          >
            Reembolso
          </p>
          <h2 className="reveal-on-scroll" style={{ "--reveal-delay": "490ms" }}>
            Te devolvemos el importe lo antes posible
          </h2>
        </div>

        <div className="returns-policy__bandContent">
          <p className="reveal-on-scroll" style={{ "--reveal-delay": "530ms" }}>
            Cuando recibamos el artículo y comprobemos que está en perfecto estado,
            realizaremos el reembolso lo antes posible y siempre dentro del plazo legal
            establecido.
          </p>
        </div>
      </section>
    </main>
  );
}
