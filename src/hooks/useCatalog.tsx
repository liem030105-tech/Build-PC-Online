import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { loadCatalog, type CatalogStatus } from '@/state/catalog';
import { session } from '@/state/session';
import { store } from '@/state/store';

interface CatalogValue extends CatalogStatus {
  /** Tăng mỗi lần danh mục được nạp lại; dùng làm phụ thuộc cho useMemo khi cần. */
  version: number;
  /** Tải lại danh mục từ máy chủ (sau khi trang quản trị thêm/sửa/xoá linh kiện). */
  reload: () => Promise<void>;
}

const CatalogContext = createContext<CatalogValue>({
  source: 'builtin',
  count: 0,
  skipped: 0,
  version: 0,
  reload: async () => {},
});

/** Giữ trạng thái danh mục linh kiện cho cả web. `initial` là kết quả nạp lúc mở trang. */
export function CatalogProvider({ initial, children }: { initial: CatalogStatus; children: ReactNode }) {
  const [status, setStatus] = useState(initial);
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const next = await loadCatalog(session.client.configured ? () => session.client.listParts() : null);
    // Linh kiện vừa bị xoá thì bỏ khỏi build đang ráp; đồng thời buộc các trang tra lại giá mới.
    store.resanitize();
    setStatus(next);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(() => ({ ...status, version, reload }), [status, version, reload]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

/** Danh mục linh kiện được nạp từ đâu (máy chủ, cache hay bản có sẵn), kèm hàm nạp lại. */
export function useCatalog(): CatalogValue {
  return useContext(CatalogContext);
}

export function catalogLine(c: CatalogStatus): string {
  const skipped = c.skipped > 0 ? ` (bỏ qua ${c.skipped} dòng thiếu thông số)` : '';
  if (c.source === 'server') return `${c.count} linh kiện, cập nhật từ máy chủ${skipped}.`;
  if (c.source === 'cache') return `Không kết nối được máy chủ: đang dùng ${c.count} linh kiện đã tải lần trước.`;
  return `Đang dùng ${c.count} linh kiện mẫu có sẵn.`;
}
