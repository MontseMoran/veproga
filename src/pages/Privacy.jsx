import React from "react";
import { useTranslation } from "react-i18next";
import "../styles/privacy.scss";

export default function Privacy() {
  const { i18n } = useTranslation();
  const isCat = i18n.language?.startsWith("cat");

  return (
    <main className="privacy">
      <div className="privacy__container">
        <h1 className="privacy__title">
          {isCat ? "Política de privacitat" : "Política de privacidad"}
        </h1>
        <p className="privacy__intro">
          {isCat
            ? "Informació bàsica sobre com tractem les dades que envies als formularis del web."
            : "Información básica sobre cómo tratamos los datos que envías en los formularios de la web."}
        </p>
        <p className="privacy__intro">
          {isCat
            ? "Pots consultar informació addicional i detallada sobre protecció de dades en aquesta Política de Privacitat."
            : "Puedes consultar información adicional y detallada sobre protección de datos en esta Política de Privacidad."}
        </p>

        <section className="privacy__section">
          <h2>{isCat ? "Responsable" : "Responsable"}</h2>
          <p>
            SOS Maullidos
          </p>
          <p>
            Email: <a href="mailto:sos.maullidos@gmail.com">sos.maullidos@gmail.com</a>
          </p>
        </section>

        <section className="privacy__section">
          <h2>{isCat ? "Finalitat" : "Finalidad"}</h2>
          <p>
            {isCat
              ? "Gestionar sol·licituds d'adopció, amadrinament, voluntariat i contacte."
              : "Gestionar solicitudes de adopción, amadrinamiento, voluntariado y contacto."}
          </p>
        </section>

        <section className="privacy__section">
          <h2>{isCat ? "Base legal" : "Base legal"}</h2>
          <p>
            {isCat
              ? "Consentiment de la persona usuaria en enviar el formulari."
              : "Consentimiento de la persona usuaria al enviar el formulario."}
          </p>
        </section>

        <section className="privacy__section">
          <h2>{isCat ? "Destinataris" : "Destinatarios"}</h2>
          <p>
            {isCat
              ? "Les dades poden ser tractades per proveïdors tecnològics necessaris per a la prestació del servei, com Supabase (infraestructura i base de dades) i Resend (enviament de correus electrònics)."
              : "Los datos pueden ser tratados por proveedores tecnológicos necesarios para la prestación del servicio, como Supabase (infraestructura y base de datos) y Resend (envío de correos electrónicos)."}
          </p>
        </section>

        <section className="privacy__section">
          <h2>{isCat ? "Conservació" : "Conservación"}</h2>
          <p>
            {isCat
              ? "Les dades es conserven durant el temps necessari per gestionar la sol·licitud."
              : "Los datos se conservan durante el tiempo necesario para gestionar la solicitud."}
          </p>
        </section>

        <section className="privacy__section">
          <h2>{isCat ? "Drets RGPD" : "Derechos RGPD"}</h2>
          <p>
            {isCat
              ? "Pots exercir els teus drets d'accés, rectificació, supressió, oposició, limitació del tractament i portabilitat escrivint a sos.maullidos@gmail.com."
              : "Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a sos.maullidos@gmail.com."}
          </p>
        </section>
      </div>
    </main>
  );
}
