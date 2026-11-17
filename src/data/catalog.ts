import { CATEGORIES, type Category, type Part } from './parts';

/**
 * Một dòng của bảng `part` trên Xano. Mọi loại linh kiện dùng chung bảng này;
 * cột nào không áp dụng cho loại đó thì để trống (null).
 */
export interface PartRow {
  key: string;
  category: string;
  name: string;
  price: number;
  socket?: string | null;
  tdp?: number | null;
  has_igpu?: boolean | null;
  igpu_score?: number | null;
  game_score?: number | null;
  ram_type?: string | null;
  form_factor?: string | null;
  total_gb?: number | null;
  sticks?: number | null;
  vram_gb?: number | null;
  power_w?: number | null;
  score?: number | null;
  capacity_gb?: number | null;
  watt?: number | null;
  rating?: string | null;
  /** Các cỡ mainboard mà vỏ case nhận, cách nhau bằng dấu phẩy: "ATX,mATX". */
  supported?: string | null;
}

/** Đổi một linh kiện trong game thành dòng của bảng `part` (dùng khi nạp dữ liệu ban đầu). */
export function partToRow(p: Part): PartRow {
  const base = { key: p.id, category: p.category, name: p.name, price: p.price };
  switch (p.category) {
    case 'cpu':
      return { ...base, socket: p.socket, tdp: p.tdp, has_igpu: p.hasIGPU, igpu_score: p.igpuScore, game_score: p.gameScore };
    case 'mainboard':
      return { ...base, socket: p.socket, ram_type: p.ramType, form_factor: p.formFactor };
    case 'ram':
      return { ...base, ram_type: p.ramType, total_gb: p.totalGB, sticks: p.sticks };
    case 'gpu':
      return { ...base, vram_gb: p.vramGB, power_w: p.powerW, score: p.score };
    case 'ssd':
      return { ...base, capacity_gb: p.capacityGB };
    case 'psu':
      return { ...base, watt: p.watt, rating: p.rating };
    case 'case':
      return { ...base, supported: p.supported.join(',') };
  }
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const positive = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

/**
 * Đổi một dòng của bảng `part` thành linh kiện. Trả về null nếu dòng thiếu
 * thông số bắt buộc của loại đó, để một dòng nhập sai không làm hỏng cả web.
 */
export function rowToPart(raw: unknown): Part | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.key);
  const name = text(row.name);
  const price = num(row.price);
  const category = text(row.category)?.toLowerCase() as Category | undefined;
  if (!id || !name || price === null || price < 0 || !category) return null;
  const base = { id, name, price };

  switch (category) {
    case 'cpu': {
      const socket = text(row.socket);
      const tdp = positive(row.tdp);
      const gameScore = positive(row.game_score);
      if (!socket || !tdp || !gameScore) return null;
      const igpuScore = Math.max(0, num(row.igpu_score) ?? 0);
      // Có iGPU khi cột has_igpu bật, hoặc khi có điểm iGPU mà quên bật cột đó.
      const hasIGPU = row.has_igpu === true || (row.has_igpu == null && igpuScore > 0);
      return { ...base, category, socket, tdp, hasIGPU, igpuScore: hasIGPU ? igpuScore : 0, gameScore };
    }
    case 'mainboard': {
      const socket = text(row.socket);
      const ramType = text(row.ram_type);
      const formFactor = text(row.form_factor);
      if (!socket || !ramType || !formFactor) return null;
      return { ...base, category, socket, ramType, formFactor };
    }
    case 'ram': {
      const ramType = text(row.ram_type);
      const totalGB = positive(row.total_gb);
      const sticks = positive(row.sticks);
      if (!ramType || !totalGB || !sticks) return null;
      return { ...base, category, ramType, totalGB, sticks };
    }
    case 'gpu': {
      const score = positive(row.score);
      const powerW = num(row.power_w);
      if (!score || powerW === null || powerW < 0) return null;
      return { ...base, category, vramGB: Math.max(0, num(row.vram_gb) ?? 0), powerW, score };
    }
    case 'ssd': {
      const capacityGB = positive(row.capacity_gb);
      if (!capacityGB) return null;
      return { ...base, category, capacityGB };
    }
    case 'psu': {
      const watt = positive(row.watt);
      if (!watt) return null;
      return { ...base, category, watt, rating: text(row.rating) ?? '' };
    }
    case 'case': {
      const supported = (text(row.supported) ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (supported.length === 0) return null;
      return { ...base, category, supported };
    }
    default:
      return null;
  }
}

export interface CatalogResult {
  parts: Part[];
  /** Số dòng bị bỏ qua vì thiếu thông số hoặc trùng key. */
  skipped: number;
  /** Các loại linh kiện không có món hợp lệ nào. Khác rỗng thì danh mục không chơi được. */
  missing: Category[];
}

/** Đổi cả danh sách dòng thành danh mục, bỏ qua dòng hỏng và dòng trùng key. */
export function rowsToCatalog(rows: unknown): CatalogResult {
  const parts: Part[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const part = rowToPart(row);
    if (!part || seen.has(part.id)) {
      skipped++;
      continue;
    }
    seen.add(part.id);
    parts.push(part);
  }
  const missing = CATEGORIES.map((c) => c.id).filter((id) => !parts.some((p) => p.category === id));
  return { parts, skipped, missing };
}
