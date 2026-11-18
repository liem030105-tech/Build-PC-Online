/** Giới hạn trước khi nén: ảnh lớn hơn thì từ chối luôn để khỏi làm treo trình duyệt. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.82;

/** Kích thước mới giữ tỉ lệ, cạnh dài nhất không quá `max`. Ảnh nhỏ hơn thì giữ nguyên. */
export function fitSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Lý do không nhận file này, hoặc null nếu dùng được. */
export function rejectReason(file: { type: string; size: number; name: string }): string | null {
  if (!file.type.startsWith('image/')) return `“${file.name}” không phải ảnh.`;
  if (file.size > MAX_INPUT_BYTES) return `“${file.name}” lớn hơn 10 MB.`;
  return null;
}

/** Thu nhỏ ảnh (cạnh dài tối đa 1600px) và nén JPEG trước khi tải lên, để tiết kiệm dung lượng Xano. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Nền trắng cho ảnh PNG trong suốt, vì JPEG không có kênh alpha.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // Nén xong mà còn to hơn file gốc (ảnh nhỏ, đã nén sẵn) thì dùng file gốc.
    return blob && blob.size < file.size ? blob : file;
  } finally {
    bitmap.close();
  }
}
