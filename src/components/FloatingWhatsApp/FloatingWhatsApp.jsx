import React, { useEffect, useState } from "react";
import "./floatingWhatsApp.scss";

const WHATSAPP_URL = "https://wa.me/34647080364";

export default function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 220);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const footer = document.querySelector(".site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.05,
      }
    );

    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  const shouldShow = isVisible && !isFooterVisible;

  return (
    <div className={`floating-whatsapp ${shouldShow ? "is-visible" : ""}`}>
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
