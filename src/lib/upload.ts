export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

const EXT: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) return "ONLY PNG, JPG, WEBP OR GIF";
  if (file.size > MAX_UPLOAD_BYTES) return "FILE TOO BIG (MAX 8 MB)";
  if (file.size === 0) return "THAT FILE IS EMPTY";
  return null;
}

/** <room>/<user>/<uuid>.<ext> — the database and storage policies require this shape. */
export function mediaPath(roomId: string, userId: string, mime: AllowedMime, id: string): string {
  return `${roomId}/${userId}/${id}.${EXT[mime]}`;
}

export function kindForMime(mime: string): "gif" | "image" {
  return mime === "image/gif" ? "gif" : "image";
}

/**
 * Shrinks large photos before upload (keeps GIFs untouched so they still
 * animate). Also strips EXIF metadata such as GPS location.
 */
export async function prepareImage(file: File, maxSide = 1600): Promise<Blob> {
  if (file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}
