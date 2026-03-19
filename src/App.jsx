import React from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Nav from "./components/Nav/Nav";
import Footer from "./components/Footer/Footer";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import ScrollToTop from "./components/ScrollToTop";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Shop from "./pages/Shop";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Login from "./pages/admin/Login";
import ShopCategories from "./pages/admin/ShopCategories";
import ShopCategoryForm from "./pages/admin/ShopCategoryForm";
import ShopProducts from "./pages/admin/ShopProducts";
import ShopProductForm from "./pages/admin/ShopProductForm";
import ProductDetail from "./pages/ProductDetail";

function SiteLayout() {
  return (
    <div className="app">
      <ScrollToTop />
      <Nav />
      <Outlet />
      <Footer />
      <CookieBanner />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SiteLayout />}>
        <Route index element={<Shop />} />
        <Route path="tienda" element={<Shop />} />
        <Route path="producto/:slug" element={<ProductDetail />} />
        <Route path="quienes-somos" element={<About />} />
        <Route path="contacto" element={<Contact />} />
        <Route path="privacidad" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="categorias" element={<ShopCategories />} />
        <Route path="categorias/nueva" element={<ShopCategoryForm />} />
        <Route path="categorias/:id/editar" element={<ShopCategoryForm />} />
        <Route path="productos" element={<ShopProducts />} />
        <Route path="productos/nuevo" element={<ShopProductForm />} />
        <Route path="productos/:id/editar" element={<ShopProductForm />} />
      </Route>
    </Routes>
  );
}
