import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getPublishedPostsByTypes } from "../lib/postsCache";
import "../styles/news.scss";

export default function News() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const data = await getPublishedPostsByTypes(["news", "event", "urgent"]);

      const sorted = (data || []).sort((a, b) => {
        const pa = a.type === "urgent" ? 0 : 1;
        const pb = b.type === "urgent" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      if (mounted) setPosts(sorted);
    })();

    return () => (mounted = false);
  }, []);

  const isCat = i18n.language?.startsWith("cat");

  return (
    <main className="news">
      <div className="news__container">
        <header className="news__header">
          <h1 className="news__title">{t("news")}</h1>
        </header>

        <section className="news__grid">
          {posts.map((p, index) => {
            const title = (isCat ? p.title_cat : p.title_es) || p.title_es || p.title_cat || "";
            const excerpt = (isCat ? p.excerpt_cat : p.excerpt_es) || p.excerpt_es || p.excerpt_cat || "";

            const imageUrl = p.image_path
              ? supabase.storage
                  .from(import.meta.env.VITE_SUPABASE_BUCKET || "cats")
                  .getPublicUrl(p.image_path).data.publicUrl
              : "";

            return (
              <article
                key={p.id}
                className={`news-card reveal-on-scroll ${p.type === "urgent" ? "news-card--urgent" : ""}`}
                style={{ "--reveal-delay": `${80 + index * 90}ms` }}
              >
                <div className="news-card__media">
                  {imageUrl ? (
                    <>
                      <div
                        className="news-card__blurBg"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                        aria-hidden="true"
                      />
                      <img className="news-card__img" src={imageUrl} alt={title} />
                    </>
                  ) : (
                    <div className="news-card__imgPlaceholder" />
                  )}

                  {p.type === "urgent" && (
                    <span className="news-card__badge">{t("urgent")}</span>
                  )}
                </div>

                <div className="news-card__body">
                  <h3 className="news-card__title">{title}</h3>
                  <p className="news-card__excerpt">{excerpt}</p>

                  <Link className="cat-card__readmore news-card__readmore" to={`/noticias/${p.id}`}>
                    {t("read_more")}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
