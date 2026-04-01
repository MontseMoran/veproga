import React, { useEffect, useState } from "react";
import "./floatingWhatsApp.scss";

const WHATSAPP_URL = "https://wa.me/34647080364";

export default function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 220);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`floating-whatsapp ${isVisible ? "is-visible" : ""}`}>
      <a
        className="floating-whatsapp__bubble"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir WhatsApp para hablar con Cristina"
      >
        <span className="floating-whatsapp__message">
          Hola, soy Cristina, estoy aquí para ayudarte
        </span>
        <span className="floating-whatsapp__iconWrap" aria-hidden="true">
          <img src="/images/icons/whatsApp.png" alt="" className="floating-whatsapp__icon" />
        </span>
      </a>
    </div>
  );
}
