import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";
import { getPublishedPostsByTypes } from "../lib/postsCache";

export default function Cases() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getPublishedPostsByTypes(["urgent"]);
      if (mounted) setPosts(data || []);
    })();
    return () => (mounted = false);
  }, []);

  return (
    <main className="container">
      <h1 className="reveal-on-scroll" style={{ "--reveal-delay": "80ms" }}>{t("cases")}</h1>
      <div className="grid">
        {posts.map((p, index) => (
          <article
            key={p.id}
            className="card reveal-on-scroll"
            style={{ "--reveal-delay": `${100 + index * 90}ms` }}
          >
            <img
              src={
                p.image_path
                  ? supabase.storage
                      .from(import.meta.env.VITE_SUPABASE_BUCKET || "public")
                      .getPublicUrl(p.image_path).publicUrl
                  : ""
              }
              alt={p.title}
            />
            <h3>{p.title}</h3>
            <p className="meta">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
