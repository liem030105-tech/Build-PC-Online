import { CATEGORIES, type BuildIds } from '../data/parts';
import { sanitize } from '../state/store';

/** Query string mô tả build, ví dụ `cpu=cpu-5600&gpu=gpu-3060`. Thứ tự theo CATEGORIES. */
export function encodeBuild(ids: BuildIds): string {
  const params = new URLSearchParams();
  for (const c of CATEGORIES) {
    const id = ids[c.id];
    if (id) params.set(c.id, id);
  }
  return params.toString();
}

/**
 * Đọc build từ query string của link chia sẻ. Bỏ qua id không có trong danh mục
 * hiện tại hoặc sai loại; `dropped` cho biết đã bỏ bao nhiêu.
 */
export function decodeBuild(search: string | URLSearchParams): { build: BuildIds; dropped: number } {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const raw: BuildIds = {};
  for (const c of CATEGORIES) {
    const id = params.get(c.id);
    if (id) raw[c.id] = id;
  }
  return sanitize(raw);
}

/** Link tuyệt đối tới trang xem build. */
export function shareUrl(ids: BuildIds, origin: string = window.location.origin): string {
  return `${origin}/share?${encodeBuild(ids)}`;
}
