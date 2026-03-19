import { supabase } from "./supabaseClient";
import { resizeImageFile } from "../utils/imageResize";

const BUCKET =
  import.meta.env.VITE_STORE_SUPABASE_BUCKET ||
  import.meta.env.VITE_SHOP_SUPABASE_BUCKET ||
  import.meta.env.VITE_SUPABASE_BUCKET ||
  "store-assets";

export async function uploadImageFile(file, folder = "uploads") {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const resized = await resizeImageFile(file, 1200, 0.7);
  const fileName = `${folder}/${Date.now()}-${
    crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  }-${resized.name}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, resized, { upsert: false });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { path: data.path, publicUrl: publicData?.publicUrl || "" };
}
