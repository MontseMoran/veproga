import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import Nav from "./components/Nav/Nav";
import Footer from "./components/Footer/Footer";
import ScrollToTop from "./components/ScrollToTop";
import PostDetail from "./pages/PostDetail";
import Donate from "./pages/Donate";
import Home from "./pages/Home";
import Adoption from "./pages/Adoption";
import Cases from "./pages/Cases";
import News from "./pages/News";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import AdminLayout from "./pages/admin2/AdminLayout";
import Dashboard from "./pages/admin2/Dashboard";
import Login from "./pages/admin2/Login";
import Cats from "./pages/admin2/Cats";
import Posts from "./pages/admin2/Posts";
import CatForm from "./pages/admin2/CatForm";
import PostForm from "./pages/admin2/PostForm";
import CatDetail from "./pages/CatDetail";
import Volunteer  from "./pages/Volunteer";
import Shop from "./pages/Shop";
import Story from "./pages/Story";
import LatestAdopted from "./pages/LatestAdopted";

function SiteLayout() {
  return (
    <div className="app">
      <Nav />
      <ScrollToTop />
      <Outlet />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ADMIN: sin Nav/Footer */}
      <Route path="/admin/login" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="cats" element={<Cats />} />
        <Route path="cats/new" element={<CatForm />} />
        <Route path="cats/:id/edit" element={<CatForm />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/new" element={<PostForm />} />
        <Route path="posts/:id/edit" element={<PostForm />} />
      </Route>

      {/* PÚBLICO: con Nav/Footer */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/adopcion" element={<Adoption />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/casos-dificiles" element={<Cases />} />
        <Route path="/ultimos-adoptados" element={<LatestAdopted />} />
        <Route path="/noticias" element={<News />} />
        <Route path="/noticias/:id" element={<PostDetail />} />
        <Route path="/blog/:id" element={<PostDetail />} />
        <Route path="/quienes-somos" element={<About />} />
        <Route path="/contacto" element={<Contact />} />
       <Route path="/donar" element={<Donate/>}/>
       <Route path="/voluntariat" element={<Volunteer />} />
        <Route path="/compras-solidarias" element={<Shop />} />
        <Route path="/adopcion/:id" element={<CatDetail />} />
        <Route path="/historias/:slug" element={<Story />} />
        
      </Route>
    </Routes>
  );
}
