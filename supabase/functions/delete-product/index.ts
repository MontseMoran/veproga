// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  const singlePath = body?.path;

  //  BORRAR SOLO 1 IMAGEN
  if (singlePath) {
    const { error } = await supabase.storage
      .from("store-assets")
      .remove([singlePath]);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  VALIDAR PRODUCTO
  if (!productId) {
    return new Response(JSON.stringify({ error: "Missing productId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  OBTENER IMÁGENES
  const { data: images, error: imagesError } = await supabase
    .from("shop_product_images")
    .select("path")
    .eq("product_id", productId);

  if (imagesError) {
    return new Response(JSON.stringify({ error: imagesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  BORRAR ARCHIVOS DEL BUCKET
  if (images?.length) {
    const paths = images.map((img) => img.path).filter(Boolean);

    if (paths.length) {
      const { error: removeError } = await supabase.storage
        .from("store-assets")
        .remove(paths);

      if (removeError) {
        return new Response(JSON.stringify({ error: removeError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  //  BORRAR TABLA IMÁGENES
  const { error: deleteImagesError } = await supabase
    .from("shop_product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteImagesError) {
    return new Response(JSON.stringify({ error: deleteImagesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  BORRAR RELACIONES CATEGORÍAS
  const { error: deleteCategoriesError } = await supabase
    .from("shop_product_categories")
    .delete()
    .eq("product_id", productId);

  if (deleteCategoriesError) {
    return new Response(JSON.stringify({ error: deleteCategoriesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  BORRAR PRODUCTO
  const { error: deleteProductError } = await supabase
    .from("shop_products")
    .delete()
    .eq("id", productId);

  if (deleteProductError) {
    return new Response(JSON.stringify({ error: deleteProductError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});