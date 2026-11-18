import { REQUIRED_CATEGORIES, RESOLUTIONS, type Category, type Part, type Resolution } from './parts';

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
  /** CPU có kèm quạt trong hộp. Bỏ trống thì đoán theo TDP (≤ 65W là có). */
  box_cooler?: boolean | null;
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
  /** Case: chiều cao tản khí tối đa (mm). */
  max_cooler_mm?: number | null;
  /** Case: các cỡ rad lắp được, "240,280,360". */
  radiators?: string | null;
  /** Case: số vị trí quạt. */
  fan_slots?: number | null;
  /** Tản nhiệt: "air" hoặc "aio". */
  cooler_type?: string | null;
  /** Tản nhiệt: các socket hỗ trợ, "LGA1700,AM4,AM5". */
  sockets?: string | null;
  max_tdp?: number | null;
  height_mm?: number | null;
  radiator_mm?: number | null;
  /** Ổ cứng thêm: "hdd" hoặc "ssd". */
  kind?: string | null;
  size_mm?: number | null;
  resolution?: string | null;
  refresh_hz?: number | null;
  size_inch?: number | null;
  panel?: string | null;
}

/** Đổi một linh kiện thành dòng của bảng `part` (dùng khi nạp dữ liệu và ở trang quản trị). */
export function partToRow(p: Part): PartRow {
  const base = { key: p.id, category: p.category, name: p.name, price: p.price };
  switch (p.category) {
    case 'cpu':
      return {
        ...base,
        socket: p.socket,
        tdp: p.tdp,
        has_igpu: p.hasIGPU,
        igpu_score: p.igpuScore,
        game_score: p.gameScore,
        box_cooler: p.boxCooler,
      };
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
      return {
        ...base,
        supported: p.supported.join(','),
        max_cooler_mm: p.maxCoolerMm ?? null,
        radiators: p.radiators ? p.radiators.join(',') : null,
        fan_slots: p.fanSlots ?? null,
      };
    case 'cooler':
      return {
        ...base,
        cooler_type: p.coolerType,
        sockets: p.sockets.join(','),
        max_tdp: p.maxTdp,
        height_mm: p.heightMm,
        radiator_mm: p.radiatorMm,
      };
    case 'drive':
      return { ...base, kind: p.kind, capacity_gb: p.capacityGB, power_w: p.powerW };
    case 'fan':
      return { ...base, size_mm: p.sizeMm, power_w: p.powerW };
    case 'monitor':
      return { ...base, resolution: p.resolution, refresh_hz: p.refreshHz, size_inch: p.sizeInch, panel: p.panel };
  }
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const positive = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};
const list = (v: unknown): string[] =>
  (text(v) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

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
      const boxCooler = typeof row.box_cooler === 'boolean' ? row.box_cooler : tdp <= 65;
      return { ...base, category, socket, tdp, hasIGPU, igpuScore: hasIGPU ? igpuScore : 0, gameScore, boxCooler };
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
      const supported = list(row.supported);
      if (supported.length === 0) return null;
      const radiators =
        text(row.radiators) === null
          ? undefined
          : list(row.radiators)
              .map(Number)
              .filter((n) => n > 0);
      return {
        ...base,
        category,
        supported,
        maxCoolerMm: positive(row.max_cooler_mm) ?? undefined,
        radiators,
        fanSlots: positive(row.fan_slots) ?? undefined,
      };
    }
    case 'cooler': {
      const coolerType = text(row.cooler_type)?.toLowerCase();
      const sockets = list(row.sockets);
      const maxTdp = positive(row.max_tdp);
      if ((coolerType !== 'air' && coolerType !== 'aio') || sockets.length === 0 || !maxTdp) return null;
      const heightMm = positive(row.height_mm) ?? 0;
      const radiatorMm = positive(row.radiator_mm) ?? 0;
      if (coolerType === 'air' ? !heightMm : !radiatorMm) return null;
      return { ...base, category, coolerType, sockets, maxTdp, heightMm, radiatorMm };
    }
    case 'drive': {
      const kind = text(row.kind)?.toLowerCase();
      const capacityGB = positive(row.capacity_gb);
      if ((kind !== 'hdd' && kind !== 'ssd') || !capacityGB) return null;
      return { ...base, category, kind, capacityGB, powerW: Math.max(0, num(row.power_w) ?? 0) };
    }
    case 'fan': {
      const sizeMm = positive(row.size_mm);
      if (!sizeMm) return null;
      return { ...base, category, sizeMm, powerW: Math.max(0, num(row.power_w) ?? 0) };
    }
    case 'monitor': {
      const res = text(row.resolution)?.toLowerCase();
      const resolution = RESOLUTIONS.find((r) => r.toLowerCase() === res) as Resolution | undefined;
      const refreshHz = positive(row.refresh_hz);
      if (!resolution || !refreshHz) return null;
      return {
        ...base,
        category,
        resolution,
        refreshHz,
        sizeInch: positive(row.size_inch) ?? 0,
        panel: text(row.panel) ?? '',
      };
    }
    default:
      return null;
  }
}

export interface CatalogResult {
  parts: Part[];
  /** Số dòng bị bỏ qua vì thiếu thông số hoặc trùng key. */
  skipped: number;
  /** Các loại BẮT BUỘC không có món hợp lệ nào. Khác rỗng thì danh mục không dùng được. */
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
  // Loại tuỳ chọn (tản, ổ thêm, quạt, màn hình) có thể chưa có trên máy chủ.
  const missing = REQUIRED_CATEGORIES.filter((id) => !parts.some((p) => p.category === id));
  return { parts, skipped, missing };
}
