import React from "react";
import "../styles/privacy.scss";

export default function Privacy() {
  return (
    <main className="privacy">
      <div className="privacy__container">
        <h1 className="privacy__title">Politica de privacidad</h1>
        <p className="privacy__intro">
          Informacion basica sobre como tratamos los datos que envias desde los
          formularios de la tienda.
        </p>

        <section className="privacy__section">
          <h2>Responsable</h2>
          <p>Bolboretas & Valu</p>
          <p>
            Email:{" "}
            <a href="mailto:info@bolboretasvalu.com">info@bolboretasvalu.com</a>
          </p>
        </section>

        <section className="privacy__section">
          <h2>Finalidad</h2>
          <p>
            Gestionar solicitudes relacionadas con productos, tallas, variantes y
            consultas comerciales enviadas desde la web.
          </p>
        </section>

        <section className="privacy__section">
          <h2>Base legal</h2>
          <p>Consentimiento de la persona usuaria al enviar el formulario.</p>
        </section>

        <section className="privacy__section">
          <h2>Destinatarios</h2>
          <p>
            Los datos pueden ser tratados por proveedores necesarios para el servicio,
            como Supabase para infraestructura y base de datos, y Resend para el envio
            de correos electronicos.
          </p>
        </section>

        <section className="privacy__section">
          <h2>Conservación</h2>
          <p>Los datos se conservan durante el tiempo necesario para gestionar la solicitud.</p>
        </section>

        <section className="privacy__section">
          <h2>Derechos</h2>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, supresión,
            oposición, limitación del tratamiento y portabilidad escribiendo a
            info@bolboretasvalu.com.
          </p>
        </section>
      </div>
    </main>
  );
}
