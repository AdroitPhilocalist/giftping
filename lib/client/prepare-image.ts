"use client";

const MAX_EDGE = 2000;
const SEND_AS_IS_BELOW = 1.5 * 1024 * 1024;

/**
 * Phone photos are routinely 4-10MB; Vercel rejects request bodies over ~4.5MB, so big images are
 * downscaled in the browser before upload. The server then validates and re-encodes everything again
 * regardless — this step is only about fitting under the size limit, not about trust.
 */
export async function prepareForUpload(file: File): Promise<Blob> {
  if (file.size <= SEND_AS_IS_BELOW) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process image"))), "image/jpeg", 0.88),
  );
}
