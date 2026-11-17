import { createContext, useContext } from 'react';
import type { CatalogStatus } from '@/state/catalog';

export const CatalogContext = createContext<CatalogStatus>({ source: 'builtin', count: 0, skipped: 0 });

/** Danh mục linh kiện được nạp từ đâu (máy chủ, cache hay bản có sẵn). */
export function useCatalog(): CatalogStatus {
  return useContext(CatalogContext);
}

export function catalogLine(c: CatalogStatus): string {
  const skipped = c.skipped > 0 ? ` (bỏ qua ${c.skipped} dòng thiếu thông số)` : '';
  if (c.source === 'server') return `${c.count} linh kiện, cập nhật từ máy chủ${skipped}.`;
  if (c.source === 'cache') return `Không kết nối được máy chủ: đang dùng ${c.count} linh kiện đã tải lần trước.`;
  return `Đang dùng ${c.count} linh kiện mẫu có sẵn.`;
}
