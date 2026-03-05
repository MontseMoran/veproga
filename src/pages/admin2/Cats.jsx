import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../styles/cats.scss";
import { clearCatsCache } from "../../lib/catsCache";

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "cats";

function normalizeStoragePath(imagePath, bucket) {
  if (!imagePath) return "";

  let path = String(imagePath).trim();

  // Some legacy rows may store full public URLs instead of object paths.
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const marker = "/object/public/";
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        path = url.pathname.slice(idx + marker.length);
      }
    } catch {
      // keep original value if URL parsing fails
    }
  }

  path = path.replace(/^\/+/, "");

  return path;
}

function getStorageDeleteCandidates(imagePath, bucket) {
  if (!imagePath) return [];

  const raw = String(imagePath).trim().replace(/^\/+/, "");
  const normalized = normalizeStoragePath(raw, bucket);
  const candidates = new Set([raw, normalized]);

  // Support rows stored with/without bucket prefix.
  if (normalized.startsWith(`${bucket}/`)) {
    candidates.add(normalized.slice(bucket.length + 1));
  } else {
    candidates.add(`${bucket}/${normalized}`);
  }

  // Support encoded names (legacy uploads with spaces/special chars).
  candidates.add(decodeURIComponent(raw));
  candidates.add(decodeURIComponent(normalized));

  return [...candidates].filter(Boolean);
}

export default function Cats() {
  const { t } = useTranslation("admin");

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      if (mounted) setCats(data || []);
      if (mounted) setLoading(false);
    })();

    return () => (mounted = false);
  }, []);

  const handleDelete = async (cat) => {
    if (!confirm(t("admin_confirm_delete_cat"))) return;

    try {
      const storagePaths = getStorageDeleteCandidates(cat.image_path, BUCKET);

      // 1. borrar imagen si existe
      if (storagePaths.length > 0) {
        let removedCount = 0;
        let lastStorageError = null;

        for (const candidate of storagePaths) {
          const { data: removed, error: storageError } = await supabase.storage
            .from(BUCKET)
            .remove([candidate]);

          if (storageError) {
            lastStorageError = storageError;
            continue;
          }

          const currentRemoved = Array.isArray(removed) ? removed.length : 0;
          if (currentRemoved > 0) {
            removedCount = currentRemoved;
            console.log("BUCKET:", BUCKET);
            console.log("RAW PATH:", cat.image_path);
            console.log("DELETED WITH:", candidate);
            console.log("DELETE DATA:", removed);
            break;
          }
        }

        if (removedCount === 0) {
          if (lastStorageError) throw lastStorageError;
          throw new Error(
            "No se ha eliminado la imagen de Storage. Revisa bucket/ruta antes de borrar el registro."
          );
        }
      }

      // 2. borrar registro
      const { error } = await supabase
        .from("cats")
        .delete()
        .eq("id", cat.id);

      if (error) throw error;

      // 3. actualizar UI
      setCats(prev => prev.filter(c => c.id !== cat.id));
      clearCatsCache();

      alert(t("admin_deleted"));

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>{t("admin_cats")}</h2>

     <div className="admin-top-actions">
  <Link
    to="/admin/cats/new"
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
        <p>{t("admin_loading")}</p>
      ) : (
        <div className="grid">
          {cats.map((cat) => (
            <div key={cat.id} className="card">
              <img
                src={
                  cat.image_path
                    ? supabase.storage
                      .from(BUCKET)
                      .getPublicUrl(cat.image_path).data.publicUrl
                    : ""
                }
                alt={cat.name}
              />

              <h4>{cat.name}</h4>
              <p>{cat.age_text}</p>

              <div className="actions">
                <Link
                  to={`/admin/cats/${cat.id}/edit`}
                  className="admin-action admin-action--edit"
                >
                  {t("admin_edit")}
                </Link>

                <button
                  type="button"
                  className="admin-action admin-action--danger"
                  onClick={() => handleDelete(cat)}
                >
                  {t("admin_delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
