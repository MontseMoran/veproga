import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { uploadImageFile } from "../../lib/storage";
import { useTranslation } from "react-i18next";
import { clearPostsCache } from "../../lib/postsCache";

export default function PostForm() {
  const { t } = useTranslation("admin");
  const { id } = useParams();
  const editMode = Boolean(id);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
const [form, setForm] = useState({
  type: "news",

  title_cat: "",
  title_es: "",

  excerpt_cat: "",
  excerpt_es: "",

  content_cat: "",
  content_es: "",

  image_path: "",
  published: false,
});
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!editMode) return;
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return alert(error.message);
      if (mounted)
      setForm({
  type: data.type,

  title_cat: data.title_cat || "",
  title_es: data.title_es || "",

  excerpt_cat: data.excerpt_cat || "",
  excerpt_es: data.excerpt_es || "",

  content_cat: data.content_cat || "",
  content_es: data.content_es || "",

  image_path: data.image_path || "",
  published: data.published || false,
});
    })();
    return () => (mounted = false);
  }, [id]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setMessage({ type: "error", text: t("image_not_image") });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: t("image_too_large") });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target?.result);
    reader.readAsDataURL(f);
    setMessage({ type: "success", text: t("msg_image_selected") });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    if (!form.title_cat.trim() && !form.title_es.trim()) {
  setMessage({ type: "error", text: t("post_title_required") });
  return;
}
    setLoading(true);
    try {
      let image_path = form.image_path;
      if (file) {
        const res = await uploadImageFile(file, "posts");
        image_path = res.path;
      }
      if (editMode) {
        const { error } = await supabase
          .from("posts")
          .update({
            ...form,
            image_path,
            updated_at: new Date(),
          })
          .eq("id", id);
        if (error) throw error;
        clearPostsCache();
        setMessage({ type: "success", text: t("updated_success") });
        setTimeout(() => nav("/admin/posts"), 1500);
      } else {
        const { error } = await supabase
          .from("posts")
          .insert([{ ...form, image_path }]);
        if (error) throw error;
        clearPostsCache();
        setMessage({ type: "success", text: t("saved_success") });
        setTimeout(() => nav("/admin/posts"), 1500);
      }
    } catch (err) {
      setMessage({ type: "error", text: t("msg_error", { msg: err.message }) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>
        {editMode
          ? t("admin_edit") + " " + t("admin_posts").toLowerCase()
          : t("admin_create") + " " + t("admin_posts").toLowerCase()}
      </h2>
      <form className="card" onSubmit={handleSubmit}>
        <label>{t("label_post_type")}</label>
        <select name="type" value={form.type} onChange={onChange}>
          <option value="news">{t("type_news")}</option>
          <option value="event">{t("type_event")}</option>
          <option value="urgent">{t("type_urgent")}</option>
          <option value="blog">{t("type_blog")}</option>
        </select>
       <label>{t("label_title_cat")}</label>
<input
  name="title_cat"
  value={form.title_cat}
  onChange={onChange}
  placeholder={t("placeholder_title_cat")}
/>

<label>{t("label_title_es")}</label>
<input
  name="title_es"
  value={form.title_es}
  onChange={onChange}
  placeholder={t("placeholder_title_es")}
/>

<label>{t("label_excerpt_cat")}</label>
<input
  name="excerpt_cat"
  value={form.excerpt_cat}
  onChange={onChange}
  placeholder={t("placeholder_excerpt_cat")}
/>

<label>{t("label_excerpt_es")}</label>
<input
  name="excerpt_es"
  value={form.excerpt_es}
  onChange={onChange}
  placeholder={t("placeholder_excerpt_es")}
/>

<label>{t("label_content_cat")}</label>
<textarea
  name="content_cat"
  value={form.content_cat}
  onChange={onChange}
  placeholder={t("placeholder_content_cat")}
/>

<label>{t("label_content_es")}</label>
<textarea
  name="content_es"
  value={form.content_es}
  onChange={onChange}
  placeholder={t("placeholder_content_es")}
/>
        <label>{t("label_date")}</label>
        <input
          type="date"
          name="created_at"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, created_at: e.target.value }))
          }
        />
        <label>
          <input
            type="checkbox"
            name="published"
            checked={form.published}
            onChange={onChange}
          />{" "}
          {t("label_published")}
        </label>
        <label>{t("label_image")}</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {preview && (
          <div style={{ marginTop: 12 }}>
            <img
              src={preview}
              alt={t("preview")}
              style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
            />
          </div>
        )}
        {form.image_path && !preview && (
          <div style={{ marginTop: 12, color: "#666", fontSize: "0.9rem" }}>
            {t("image_current")}
          </div>
        )}

        {message.text && (
          <div
            style={{
              padding: 10,
              marginTop: 12,
              borderRadius: 8,
              backgroundColor: message.type === "error" ? "#fee" : "#efe",
              color: message.type === "error" ? "#c33" : "#3c3",
              fontSize: "0.9rem",
            }}
          >
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? t("saving") : t("btn_save")}
        </button>
      </form>
    </div>
  );
}
