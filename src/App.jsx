import React from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Nav from "./components/Nav/Nav";
import Footer from "./components/Footer/Footer";
import FloatingWhatsApp from "./components/FloatingWhatsApp/FloatingWhatsApp";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import ScrollToTop from "./components/ScrollToTop";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import ReturnsPolicy from "./pages/ReturnsPolicy";
import Shop from "./pages/Shop";
import CategoryPage from "./pages/CategoryPage";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Login from "./pages/admin/Login";
import ShopCategories from "./pages/admin/ShopCategories";
import ShopCategoryForm from "./pages/admin/ShopCategoryForm";
import ShopSubcategories from "./pages/admin/ShopSubcategories";
import ShopSubcategoryForm from "./pages/admin/ShopSubcategoryForm";
import ShopProducts from "./pages/admin/ShopProducts";
import ShopProductForm from "./pages/admin/ShopProductForm";
import ShopDiscountCodes from "./pages/admin/ShopDiscountCodes";
import ShopDiscountCodeForm from "./pages/admin/ShopDiscountCodeForm";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";

function SiteLayout() {
  return (
    <div className="app">
      <ScrollToTop />
      <Nav />
      <Outlet />
      <FloatingWhatsApp />
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
        <Route path="categoria/:slug" element={<CategoryPage />} />
        <Route path="producto/:slug" element={<ProductDetail />} />
        <Route path="carrito" element={<Cart />} />
        <Route path="quienes-somos" element={<About />} />
        <Route path="contacto" element={<Contact />} />
        <Route path="privacidad" element={<Privacy />} />
        <Route path="politica-de-devoluciones" element={<ReturnsPolicy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="categorias" element={<ShopCategories />} />
        <Route path="categorias/nueva" element={<ShopCategoryForm />} />
        <Route path="categorias/:id/editar" element={<ShopCategoryForm />} />
        <Route path="subcategorias" element={<ShopSubcategories />} />
        <Route path="subcategorias/nueva" element={<ShopSubcategoryForm />} />
        <Route path="subcategorias/:id/editar" element={<ShopSubcategoryForm />} />
        <Route path="productos" element={<ShopProducts />} />
        <Route path="productos/nuevo" element={<ShopProductForm />} />
        <Route path="productos/:id/editar" element={<ShopProductForm />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="pedidos/:id" element={<OrderDetail />} />
        <Route path="descuentos" element={<ShopDiscountCodes />} />
        <Route path="descuentos/nuevo" element={<ShopDiscountCodeForm />} />
        <Route path="descuentos/:id/editar" element={<ShopDiscountCodeForm />} />
      </Route>
    </Routes>
  );
}
