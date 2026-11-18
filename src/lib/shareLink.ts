import { CATEGORIES, sanitizeIds, type BuildIds } from '../data/parts';

/**
 * Query string mô tả build, ví dụ `cpu=cpu-5600&gpu=gpu-3060&drive=a,b&fan=fan-p12*3`.
 * Thứ tự theo CATEGORIES.
 */
export function encodeBuild(ids: BuildIds): string {
  const params = new URLSearchParams();
  for (const c of CATEGORIES) {
    if (c.id === 'drive') {
      if (ids.drive?.length) params.set('drive', ids.drive.join(','));
    } else if (c.id === 'fan') {
      if (ids.fan) params.set('fan', `${ids.fan.id}*${ids.fan.qty}`);
    } else {
      const id = ids[c.id];
      if (id) params.set(c.id, id);
    }
  }
  return params.toString();
}

/**
 * Đọc build từ query string của link chia sẻ. Bỏ qua id không có trong danh mục
 * hiện tại hoặc sai loại; `dropped` cho biết đã bỏ bao nhiêu.
 */
export function decodeBuild(search: string | URLSearchParams): { build: BuildIds; dropped: number } {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const raw: Record<string, unknown> = {};
  for (const c of CATEGORIES) {
    const value = params.get(c.id);
    if (!value) continue;
    if (c.id === 'drive') raw.drive = value.split(',').filter(Boolean);
    else if (c.id === 'fan') {
      const [id, qty] = value.split('*');
      raw.fan = { id, qty: Number(qty) || 1 };
    } else raw[c.id] = value;
  }
  return sanitizeIds(raw);
}

/** Link tuyệt đối tới trang xem build. */
export function shareUrl(ids: BuildIds, origin: string = window.location.origin): string {
  return `${origin}/share?${encodeBuild(ids)}`;
}
