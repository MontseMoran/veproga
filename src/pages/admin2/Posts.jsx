import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearPostsCache } from "../../lib/postsCache";

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "cats";

function getStorageDeleteCandidates(imagePath) {
  if (!imagePath) return [];

  const raw = String(imagePath).trim().replace(/^\/+/, "");
  const candidates = new Set([raw]);

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const marker = "/object/public/";
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        candidates.add(url.pathname.slice(idx + marker.length).replace(/^\/+/, ""));
      }
    } catch {
      // ignore invalid URL
    }
  }

  candidates.add(decodeURIComponent(raw));
  return [...candidates].filter(Boolean);
}

export default function Posts() {
  const { t, i18n } = useTranslation("admin");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      if (mounted) setPosts(data || []);
      setLoading(false);
    })();
    return () => (mounted = false);
  }, []);

  const handleDelete = async (post) => {
    if (!confirm(t("admin_confirm_delete_post"))) return;

    try {
      const storagePaths = getStorageDeleteCandidates(post.image_path);

      if (storagePaths.length > 0) {
        let removedCount = 0;

        for (const candidate of storagePaths) {
          const { data: removed, error: storageError } = await supabase.storage
            .from(BUCKET)
            .remove([candidate]);

          if (storageError) continue;

          const count = Array.isArray(removed) ? removed.length : 0;
          if (count > 0) {
            removedCount = count;
            break;
          }
        }

        if (removedCount === 0) {
          throw new Error(
            "No se ha eliminado la imagen de Storage. Revisa bucket/ruta antes de borrar el registro."
          );
        }
      }

      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      clearPostsCache();
      alert(t("admin_deleted"));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>{t("admin_posts")}</h2>

     <div className="admin-top-actions">
  <Link
    to="/admin/posts/new"
    className="admin-action admin-action--primary"
  >
    {t("admin_create")}
  </Link>

  <button
    type="button"
    className="admin-action admin-action--ghost"
    onClick={() => nav("/")}
  >
    {t("admin_view_public")}
  </button>
</div>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid">
          {posts.map((post) => {
            const isCatLang = i18n.language?.startsWith("cat");

            const title =
              (isCatLang ? post.title_cat : post.title_es) ||
              post.title_es ||
              post.title_cat ||
              "";

            const excerpt =
              (isCatLang ? post.excerpt_cat : post.excerpt_es) ||
              post.excerpt_es ||
              post.excerpt_cat ||
              "";

            return (
              <div key={post.id} className="card">
                <img
                  src={
                    post.image_path
                      ? supabase.storage
                        .from(BUCKET)
                        .getPublicUrl(post.image_path).data.publicUrl
                      : ""
                  }
                  alt={title}
                />

                <h4>{title}</h4>

                <p>{excerpt}</p>
                <div className="actions">
                  <Link
                    to={`/admin/posts/${post.id}/edit`}
                    className="admin-action admin-action--edit"
                  >
                    {t("edit")}
                  </Link>

                  <button
                    type="button"
                    className="admin-action admin-action--danger"
                    onClick={() => handleDelete(post)}
                  >
                    {t("admin_delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
