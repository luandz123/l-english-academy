/**
 * Thu nhỏ ảnh ngay trên trình duyệt trước khi tải lên: ảnh chụp điện thoại thường 3–12MB,
 * vượt giới hạn 5MB của API ảnh hồ sơ, và đuôi tệp lạ (.jfif, .heic...) bị server từ chối.
 * Kết quả luôn là JPEG/WebP có đuôi khớp định dạng. GIF giữ nguyên để không mất chuyển động.
 */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export class ImageProcessError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new ImageProcessError(
          "Trình duyệt không đọc được ảnh này (ảnh HEIC của iPhone?). Hãy chọn ảnh JPG hoặc PNG.",
        ),
      );
    };
    img.src = url;
  });
}

/**
 * @param maxSide cạnh dài tối đa sau khi thu nhỏ (px)
 * @param square cắt vuông ở giữa (dùng cho ảnh đại diện)
 */
export async function prepareImageForUpload(
  file: File,
  { maxSide, square = false, baseName }: { maxSide: number; square?: boolean; baseName: string },
): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jfif)$/i.test(file.name)) {
    throw new ImageProcessError("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP, GIF).");
  }

  if (file.type === "image/gif") {
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      throw new ImageProcessError("Ảnh GIF tối đa 5MB.");
    }
    return new File([file], `${baseName}.gif`, { type: "image/gif" });
  }

  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;
  if (square) {
    const side = Math.min(srcW, srcH);
    sx = Math.round((srcW - side) / 2);
    sy = Math.round((srcH - side) / 2);
    sw = side;
    sh = side;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const outW = Math.max(1, Math.round(sw * scale));
  const outH = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessError("Không xử lý được ảnh trên trình duyệt này.");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new ImageProcessError("Không xử lý được ảnh trên trình duyệt này.");
  if (blob.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new ImageProcessError("Ảnh vẫn lớn hơn 5MB sau khi nén, hãy chọn ảnh khác.");
  }
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
