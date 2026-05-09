// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bucketName = Deno.env.get("SUPABASE_BUCKET") || "store-assets";

async function removeStoragePaths(supabase, paths: string[]) {
  const cleanPaths = Array.from(new Set((paths || []).filter(Boolean)));

  if (cleanPaths.length === 0) {
    return null;
  }

  const { error } = await supabase.storage.from(bucketName).remove(cleanPaths);
  return error || null;
}

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
    const removeSinglePathError = await removeStoragePaths(supabase, [singlePath]);

    if (removeSinglePathError) {
      return new Response(JSON.stringify({ error: removeSinglePathError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteImageRowError } = await supabase
      .from("shop_product_images")
      .delete()
      .eq("path", singlePath);

    if (deleteImageRowError) {
      return new Response(JSON.stringify({ error: deleteImageRowError.message }), {
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
      const removeError = await removeStoragePaths(supabase, paths);

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

  //  BORRAR RELACIONES SUBCATEGORÍAS
  const { error: deleteSubcategoriesError } = await supabase
    .from("shop_product_subcategories")
    .delete()
    .eq("product_id", productId);

  if (deleteSubcategoriesError) {
    return new Response(JSON.stringify({ error: deleteSubcategoriesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  //  BORRAR VARIANTES
  const { error: deleteVariantsError } = await supabase
    .from("shop_product_variants")
    .delete()
    .eq("product_id", productId);

  if (deleteVariantsError) {
    return new Response(JSON.stringify({ error: deleteVariantsError.message }), {
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
