const MAX_INPUT_BYTES = 3 * 1024 * 1024;

export async function resizeImageFile(file, maxLong = 1200, quality = 0.7) {
  if (!file) {
    throw new Error("No se ha recibido ninguna imagen.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("La imagen supera el máximo permitido de 3 MB.");
  }

  const fileName = String(file.name || "").toLowerCase();
  const fileType = String(file.type || "").toLowerCase();
  const isHeicLike =
    fileType.includes("heic") ||
    fileType.includes("heif") ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif");

  if (isHeicLike) {
    throw new Error(
      "Las fotos HEIC o HEIF no son compatibles todavía. Usa JPG o PNG."
    );
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const ratio =
    img.width > img.height ? img.width / maxLong : img.height / maxLong;
  const width = Math.round(img.width / Math.max(1, ratio));
  const height = Math.round(img.height / Math.max(1, ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo preparar la imagen para subirla.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) {
    throw new Error("No se pudo convertir la imagen. Prueba con otra foto JPG o PNG.");
  }

  return new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, ".jpg"), {
    type: "image/jpeg",
  });
}
