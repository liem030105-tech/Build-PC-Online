import { afterEach, describe, expect, it } from 'vitest';
import { partToRow } from '../data/catalog';
import { BUILTIN_PARTS, PARTS, PART_BY_ID, partsOf, setCatalog } from '../data/parts';
import { loadCatalog } from './catalog';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const builtinRows = () => BUILTIN_PARTS.map(partToRow);
/** Danh mục máy chủ: như danh mục đi kèm nhưng đổi giá một món và thêm một CPU mới. */
const serverRows = () => [
  ...builtinRows().map((r) => (r.key === 'cpu-7600' ? { ...r, price: 4_000_000 } : r)),
  { key: 'cpu-9800x3d', category: 'cpu', name: 'AMD Ryzen 7 9800X3D', price: 13_000_000, socket: 'AM5', tdp: 120, has_igpu: true, igpu_score: 8, game_score: 210 },
];

afterEach(() => setCatalog(BUILTIN_PARTS));

describe('loadCatalog', () => {
  it('dùng danh mục máy chủ và lưu lại bản dự phòng', async () => {
    const storage = memoryStorage();
    const status = await loadCatalog(async () => serverRows(), storage);

    expect(status).toEqual({ source: 'server', count: BUILTIN_PARTS.length + 1, skipped: 0 });
    expect(PART_BY_ID.get('cpu-7600')?.price).toBe(4_000_000);
    expect(PART_BY_ID.get('cpu-9800x3d')?.name).toBe('AMD Ryzen 7 9800X3D');
    expect(partsOf('cpu')).toHaveLength(7);
    expect(PARTS).toHaveLength(BUILTIN_PARTS.length + 1);
    expect(storage.data.has('buildpc-catalog-v1')).toBe(true);
  });

  it('mất mạng thì dùng bản đã tải lần trước', async () => {
    const storage = memoryStorage();
    await loadCatalog(async () => serverRows(), storage);
    setCatalog(BUILTIN_PARTS);

    const status = await loadCatalog(async () => {
      throw new Error('offline');
    }, storage);

    expect(status.source).toBe('cache');
    expect(PART_BY_ID.has('cpu-9800x3d')).toBe(true);
  });

  it('mất mạng và chưa có bản dự phòng thì dùng danh mục đi kèm', async () => {
    const status = await loadCatalog(async () => {
      throw new Error('offline');
    }, memoryStorage());
    expect(status).toEqual({ source: 'builtin', count: BUILTIN_PARTS.length, skipped: 0 });
    expect(PARTS).toEqual([...BUILTIN_PARTS]);
  });

  it('không dùng danh mục máy chủ nếu thiếu hẳn một loại linh kiện', async () => {
    const rows = builtinRows().filter((r) => r.category !== 'psu');
    const status = await loadCatalog(async () => rows, memoryStorage());
    expect(status.source).toBe('builtin');
    expect(partsOf('psu').length).toBeGreaterThan(0);
  });

  it('bỏ dòng nhập sai nhưng vẫn dùng phần còn lại, và báo số dòng bị bỏ', async () => {
    const rows = [...builtinRows(), { key: 'gpu-sai', category: 'gpu', name: 'Thiếu điểm', price: 1 }];
    const status = await loadCatalog(async () => rows, memoryStorage());
    expect(status).toEqual({ source: 'server', count: BUILTIN_PARTS.length, skipped: 1 });
    expect(PART_BY_ID.has('gpu-sai')).toBe(false);
  });

  it('quá giờ chờ thì chuyển sang dự phòng thay vì treo', async () => {
    const never = () => new Promise<unknown[]>(() => {});
    const status = await loadCatalog(never, memoryStorage(), 20);
    expect(status.source).toBe('builtin');
  });

  it('chưa cấu hình máy chủ thì dùng danh mục đi kèm', async () => {
    expect((await loadCatalog(null, memoryStorage())).source).toBe('builtin');
  });

  it('bỏ qua bản dự phòng bị hỏng', async () => {
    const storage = memoryStorage({ 'buildpc-catalog-v1': '{not json' });
    expect((await loadCatalog(null, storage)).source).toBe('builtin');
  });
});
