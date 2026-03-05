import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearCatsCache } from "../../lib/catsCache";

export default function CatForm() {
  const { t } = useTranslation("admin");
  const nav = useNavigate();
  const { id } = useParams(); //  si existe, estamos en modo editar

  const isEdit = useMemo(() => Boolean(id), [id]);
  const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "cats";

  const [form, setForm] = useState({
    name: "",
    birth_date: "",
    sex: "unknown", // male | female | unknown
    status: "en_adopcion", // en_adopcion | caso_especial | adoptado | baja
    description_es: "",
    description_cat: "",
    sterilized: false,
    tested: false,
    fiv_result: "unknown",
    felv_result: "unknown",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImagePath, setExistingImagePath] = useState(""); //  para editar sin subir nueva foto
  const [saving, setSaving] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);

  // ======== CARGA DATOS EN MODO EDIT =========
  useEffect(() => {
    let mounted = true;

    const loadCat = async () => {
      if (!isEdit) return;
      setLoadingCat(true);

      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .eq("id", id)
        .single();

      if (!mounted) return;

      if (error) {
        alert(error.message);
        setLoadingCat(false);
        return;
      }

      // Rellenar form
      setForm({
        name: data?.name ?? "",
        birth_date: data?.birth_date ?? "",
        sex: data?.sex ?? "unknown",
        status: data?.status ?? "en_adopcion",
        description_es: data?.description_es ?? "",
        description_cat: data?.description_cat ?? "",
        sterilized: Boolean(data?.sterilized),
        tested: Boolean(data?.tested),
        fiv_result: data?.fiv_result ?? "unknown",
        felv_result: data?.felv_result ?? "unknown",
      });

      // Imagen
      const imgPath = data?.image_path ?? "";
      setExistingImagePath(imgPath);

      if (imgPath) {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(imgPath);
        setImagePreview(pub?.publicUrl || "");
      } else {
        setImagePreview("");
      }

      setLoadingCat(false);
    };

    loadCat();

    return () => {
      mounted = false;
    };
  }, [id, isEdit, BUCKET]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      if (name === "tested") {
        const nextTested = checked;
        return {
          ...prev,
          tested: nextTested,
          fiv_result: nextTested ? prev.fiv_result : "unknown",
          felv_result: nextTested ? prev.felv_result : "unknown",
        };
      }

      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen válida.");
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  //  resize + compresión (sin librerías)
  const compressImage = (file, maxWidth = 1600, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("No se pudo comprimir la imagen."));
            resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = url;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    //  En crear: foto obligatoria
    if (!isEdit && !imageFile) {
      alert("La foto es obligatoria.");
      return;
    }

    setSaving(true);

    try {
      let finalImagePath = existingImagePath;

      // Si el usuario eligió nueva imagen, la subimos y sustituimos image_path
      if (imageFile) {
        const compressed = await compressImage(imageFile, 1600, 0.8);

        const fileName = `cats/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, compressed, { contentType: "image/jpeg", upsert: false });

        if (upErr) {
          alert(upErr.message);
          return;
        }

        finalImagePath = fileName;
      }

      const payload = {
        ...form,
        birth_date: form.birth_date ? form.birth_date : null,
        image_path: finalImagePath || null,
        updated_at: new Date().toISOString(),
      };

      // ✅ Editar vs Crear
      const res = isEdit
        ? await supabase.from("cats").update(payload).eq("id", id)
        : await supabase.from("cats").insert([payload]);

      if (res.error) {
        alert(res.error.message);
        return;
      }

      clearCatsCache();
      nav("/admin/cats");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-form">
      <h2>{isEdit ? t("admin_edit_cat") : t("admin_create_cat")}</h2>

      {loadingCat ? (
        <p>{t("admin_loading")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="admin-form__grid">
          <div>
            <label>{t("label_name")}</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>

          <div>
            <label>{t("label_birth_date")}</label>
            <input
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>{t("label_sex")}</label>
            <div className="admin-radioRow">
              <label className="admin-radio">
                <input
                  type="radio"
                  name="sex"
                  value="female"
                  checked={form.sex === "female"}
                  onChange={handleChange}
                />
                {t("sex_female")}
              </label>

              <label className="admin-radio">
                <input
                  type="radio"
                  name="sex"
                  value="male"
                  checked={form.sex === "male"}
                  onChange={handleChange}
                />
                {t("sex_male")}
              </label>

              <label className="admin-radio">
                <input
                  type="radio"
                  name="sex"
                  value="unknown"
                  checked={form.sex === "unknown"}
                  onChange={handleChange}
                />
                {t("sex_unknown")}
              </label>
            </div>
          </div>

          <div>
            <label>{t("label_status")}</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="en_adopcion">{t("status_en_adopcion")}</option>
              <option value="caso_especial">{t("status_caso_especial")}</option>
              <option value="adoptado">{t("status_adoptado")}</option>
              <option value="baja">{t("status_baja")}</option>
            </select>
          </div>

          <div className="full">
            <label>{t("label_description_cat")}</label>
            <textarea
              name="description_cat"
              value={form.description_cat}
              onChange={handleChange}
              maxLength={2000}
              placeholder="Descriu aquí en català"
            />
          </div>
 <div className="full">
            <label>{t("label_description_es")}</label>
            <textarea
              name="description_es"
              value={form.description_es}
              onChange={handleChange}
              maxLength={2000}
              placeholder="Describe aquí en castellano"
            />
          </div>
          <div className="checkbox">
            <input
              type="checkbox"
              name="sterilized"
              checked={form.sterilized}
              onChange={handleChange}
            />
            <label>{t("label_sterilized")}</label>
          </div>

          <div className="checkbox">
            <input type="checkbox" name="tested" checked={form.tested} onChange={handleChange} />
            <label>{t("label_tested")}</label>
          </div>

          {form.tested && (
            <>
              <div>
                <label>{t("label_fiv_result")}</label>
                <select name="fiv_result" value={form.fiv_result} onChange={handleChange}>
                  <option value="unknown">{t("result_unknown")}</option>
                  <option value="negative">{t("result_negative")}</option>
                  <option value="positive">{t("result_positive")}</option>
                </select>
              </div>

              <div>
                <label>{t("label_felv_result")}</label>
                <select name="felv_result" value={form.felv_result} onChange={handleChange}>
                  <option value="unknown">{t("result_unknown")}</option>
                  <option value="negative">{t("result_negative")}</option>
                  <option value="positive">{t("result_positive")}</option>
                </select>
              </div>
            </>
          )}

          <div className="full">
            <label>{t("label_image")}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePickImage}
              // ✅ en editar NO obligamos a subir otra
              required={!isEdit}
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                style={{ marginTop: 10, width: "100%", maxWidth: 420, borderRadius: 12 }}
              />
            )}
          </div>

          <div className="full">
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving ? t("admin_saving") : t("btn_save")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
