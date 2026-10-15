export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateUploadImage(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen debe pesar como máximo 5 MB.");
  }
}

export async function compressImageFile(file: File, maxBytes = 2 * 1024 * 1024): Promise<File> {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  }
  if (file.size <= maxBytes) {
    validateUploadImage(file);
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la compresión de la imagen.");
    }

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob: Blob | null = null;

    while (quality >= 0.45) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

      if (blob && blob.size <= maxBytes) {
        break;
      }

      quality -= 0.1;
    }

    if (!blob) {
      throw new Error("No se pudo comprimir la imagen.");
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("La imagen debe pesar como máximo 5 MB después de comprimirla.");
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
