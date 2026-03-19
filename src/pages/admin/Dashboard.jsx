import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <h1>Panel de administracion</h1>
      <p>Desde aqui la propietaria puede organizar categorias y subir articulos con foto, descripcion y tallas.</p>

      <div className="admin-top-actions">
        <Link to="/admin/categorias" className="admin-action admin-action--primary">
          Gestionar categorias
        </Link>
        <Link to="/admin/productos" className="admin-action admin-action--ghost">
          Gestionar productos
        </Link>
      </div>
    </div>
  );
}
