import { rowsToCatalog } from '../data/catalog';
import { BUILTIN_PARTS, setCatalog, type Part } from '../data/parts';

const CACHE_KEY = 'buildpc-catalog-v1';

/** server: vừa tải từ Xano. cache: bản tải lần trước. builtin: danh mục đi kèm trò chơi. */
export type CatalogSource = 'server' | 'cache' | 'builtin';

export interface CatalogStatus {
  source: CatalogSource;
  count: number;
  /** Số dòng trên máy chủ bị bỏ qua vì nhập thiếu hoặc sai. */
  skipped: number;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => (clearTimeout(timer), resolve(value)),
      (error) => (clearTimeout(timer), reject(error)),
    );
  });
}

/** Danh mục dùng được khi loại linh kiện nào cũng có ít nhất một món. */
function usable(rows: unknown): { parts: Part[]; skipped: number } | null {
  const result = rowsToCatalog(rows);
  return result.missing.length === 0 ? result : null;
}

/**
 * Chọn danh mục linh kiện cho phiên chơi, theo thứ tự ưu tiên:
 * máy chủ Xano, rồi bản đã tải lần trước, cuối cùng là danh mục đi kèm.
 * Không bao giờ ném lỗi: mất mạng thì trò chơi vẫn chạy.
 */
export async function loadCatalog(
  fetchRows: (() => Promise<unknown[]>) | null,
  storage: Storage | null = defaultStorage(),
  timeoutMs = 5000,
): Promise<CatalogStatus> {
  if (fetchRows) {
    try {
      const rows = await timeout(fetchRows(), timeoutMs);
      const fresh = usable(rows);
      if (fresh) {
        setCatalog(fresh.parts);
        try {
          storage?.setItem(CACHE_KEY, JSON.stringify(rows));
        } catch {
          // Không lưu được bản dự phòng thì lần sau mất mạng sẽ dùng danh mục đi kèm.
        }
        return { source: 'server', count: fresh.parts.length, skipped: fresh.skipped };
      }
    } catch {
      // Mất mạng, quá giờ hoặc máy chủ lỗi: thử bản dự phòng bên dưới.
    }
  }

  try {
    const raw = storage?.getItem(CACHE_KEY);
    const cached = raw ? usable(JSON.parse(raw)) : null;
    if (cached) {
      setCatalog(cached.parts);
      return { source: 'cache', count: cached.parts.length, skipped: cached.skipped };
    }
  } catch {
    // Bản dự phòng hỏng: bỏ qua.
  }

  setCatalog(BUILTIN_PARTS);
  return { source: 'builtin', count: BUILTIN_PARTS.length, skipped: 0 };
}
