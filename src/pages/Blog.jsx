import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getPublishedPostsByTypes } from "../lib/postsCache";
import "../styles/news.scss"; // reutiliza el mismo layout/cards que News (si quieres)

export default function Blog() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const isCat = i18n.language?.startsWith("cat");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const data = await getPublishedPostsByTypes(["blog"]);

      if (mounted) setPosts(data || []);
    })();

    return () => (mounted = false);
  }, []);

  return (
    <main className="news">
      <div className="news__container">
        <header className="news__header">
          <h1 className="news__title">{t("blog")}</h1>
        </header>

        <section className="news__grid">
          {posts.map((p, index) => {
            const title =
              (isCat ? p.title_cat : p.title_es) || p.title_es || p.title_cat || "";
            const excerpt =
              (isCat ? p.excerpt_cat : p.excerpt_es) || p.excerpt_es || p.excerpt_cat || "";

            const imageUrl = p.image_path
              ? supabase.storage.from("cats").getPublicUrl(p.image_path).data?.publicUrl
              : "";

            return (
              <article
                key={p.id}
                className="news-card reveal-on-scroll"
                style={{ "--reveal-delay": `${80 + index * 90}ms` }}
              >
                <div
  className="news-card__media"
  style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
>
                  {imageUrl ? (
                    <img className="news-card__img" src={imageUrl} alt={title} />
                  ) : (
                    <div className="news-card__imgPlaceholder" />
                  )}
                </div>

                <div className="news-card__body">
                  <h3 className="news-card__title">{title}</h3>
                  <p className="news-card__excerpt">{excerpt}</p>

                  <Link className="cat-card__readmore news-card__readmore" to={`/blog/${p.id}`}>
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
