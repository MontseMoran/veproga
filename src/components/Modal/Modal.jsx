import "./modal.scss";
import { useEffect } from "react";

export default function Modal({ isOpen, onClose, children, topOffset= 0 }) {

  if (!isOpen) return null;
useEffect(() => {
  if (!isOpen) return;

  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = prev;
  };
}, [isOpen]);
  return (
   <div
  className="modal-overlay"
  onClick={onClose}
  style={{ "--modal-top": `${topOffset}px` }}
>
      
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Cerrar"
        >
          ×
        </button>

        {children}

      </div>

    </div>
  );
}