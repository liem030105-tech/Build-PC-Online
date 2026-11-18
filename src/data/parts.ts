export type Category =
  | 'cpu'
  | 'mainboard'
  | 'ram'
  | 'gpu'
  | 'ssd'
  | 'psu'
  | 'case'
  | 'cooler'
  | 'drive'
  | 'fan'
  | 'monitor';

/** Loại chỉ chọn một món. `drive` (nhiều ổ) và `fan` (kèm số lượng) lưu theo cách riêng. */
export type SingleCategory = Exclude<Category, 'drive' | 'fan'>;

// Danh mục có thể đến từ bảng `part` trên Xano, nên các giá trị này là chuỗi tự do
// (ví dụ "AM5", "DDR5", "ATX") chứ không giới hạn trong một danh sách cố định.
// Luật tương thích chỉ so sánh chúng có bằng nhau hay không.
export type Socket = string;
export type RamType = string;
export type FormFactor = string;

interface Base {
  id: string;
  name: string;
  /** Giá tham khảo, VND. */
  price: number;
}

export interface Cpu extends Base {
  category: 'cpu';
  socket: Socket;
  tdp: number;
  hasIGPU: boolean;
  /** Điểm đồ họa tích hợp, cùng thang với Gpu.score. 0 nếu không có iGPU. */
  igpuScore: number;
  /** Điểm chơi game, 100 = Ryzen 5 5600. */
  gameScore: number;
  /** Có kèm quạt tản nhiệt trong hộp, không cần mua tản rời. */
  boxCooler: boolean;
}

export interface Mainboard extends Base {
  category: 'mainboard';
  socket: Socket;
  ramType: RamType;
  formFactor: FormFactor;
}

export interface Ram extends Base {
  category: 'ram';
  ramType: RamType;
  totalGB: number;
  sticks: number;
}

export interface Gpu extends Base {
  category: 'gpu';
  vramGB: number;
  powerW: number;
  /** Điểm đồ họa, 100 = RTX 3060. */
  score: number;
}

export interface Ssd extends Base {
  category: 'ssd';
  capacityGB: number;
}

export interface Psu extends Base {
  category: 'psu';
  watt: number;
  rating: string;
}

export interface Case extends Base {
  category: 'case';
  supported: FormFactor[];
  /** Chiều cao tản khí tối đa (mm). Không có thì bỏ qua luật này. */
  maxCoolerMm?: number;
  /** Các cỡ radiator tản nước lắp được, ví dụ [240, 280, 360]. */
  radiators?: number[];
  /** Số vị trí lắp quạt. */
  fanSlots?: number;
}

export interface Cooler extends Base {
  category: 'cooler';
  coolerType: 'air' | 'aio';
  sockets: Socket[];
  /** Công suất nhiệt tối đa tản được (W). */
  maxTdp: number;
  /** Chiều cao tản khí (mm), 0 với tản nước. */
  heightMm: number;
  /** Cỡ radiator tản nước (mm), 0 với tản khí. */
  radiatorMm: number;
}

export interface Drive extends Base {
  category: 'drive';
  kind: 'hdd' | 'ssd';
  capacityGB: number;
  powerW: number;
}

export interface Fan extends Base {
  category: 'fan';
  sizeMm: number;
  powerW: number;
}

export interface Monitor extends Base {
  category: 'monitor';
  resolution: Resolution;
  refreshHz: number;
  sizeInch: number;
  panel: string;
}

export type Resolution = '1080p' | '1440p' | '4K';
export const RESOLUTIONS: Resolution[] = ['1080p', '1440p', '4K'];

export type Part = Cpu | Mainboard | Ram | Gpu | Ssd | Psu | Case | Cooler | Drive | Fan | Monitor;

/** Build đã tra ra linh kiện từ danh mục. */
export interface Build {
  cpu?: Cpu;
  mainboard?: Mainboard;
  ram?: Ram;
  gpu?: Gpu;
  ssd?: Ssd;
  psu?: Psu;
  case?: Case;
  cooler?: Cooler;
  monitor?: Monitor;
  /** Ổ lưu trữ thêm, tối đa MAX_DRIVES. */
  drive?: Drive[];
  fan?: { part: Fan; qty: number };
}

export interface FanPick {
  id: string;
  qty: number;
}

/** Build lưu theo id; đây là dạng được lưu vào máy, vào Xano và đưa lên link chia sẻ. */
export type BuildIds = Partial<Record<SingleCategory, string>> & {
  drive?: string[];
  fan?: FanPick;
};

export const MAX_DRIVES = 2;
export const MAX_FANS = 9;

export interface CategoryMeta {
  id: Category;
  label: string;
  /** Không bắt buộc để máy chạy được. */
  optional?: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'cpu', label: 'CPU' },
  { id: 'mainboard', label: 'Mainboard' },
  { id: 'ram', label: 'RAM' },
  { id: 'gpu', label: 'Card đồ họa' },
  { id: 'ssd', label: 'Ổ cứng SSD' },
  { id: 'psu', label: 'Nguồn' },
  { id: 'case', label: 'Vỏ case' },
  { id: 'cooler', label: 'Tản nhiệt CPU', optional: true },
  { id: 'drive', label: 'Ổ cứng thêm', optional: true },
  { id: 'fan', label: 'Quạt case', optional: true },
  { id: 'monitor', label: 'Màn hình', optional: true },
];

/** 7 loại bắt buộc (tản nhiệt chỉ bắt buộc khi CPU không kèm quạt). */
export const REQUIRED_CATEGORIES = CATEGORIES.filter((c) => !c.optional).map((c) => c.id);

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  Category,
  CategoryMeta
>;

const SINGLE: SingleCategory[] = CATEGORIES.map((c) => c.id).filter(
  (id): id is SingleCategory => id !== 'drive' && id !== 'fan',
);

/** Danh mục đi kèm web: dùng khi không tải được danh mục từ máy chủ. */
export const BUILTIN_PARTS: readonly Part[] = [
  // CPU
  { category: 'cpu', id: 'cpu-12100f', name: 'Intel Core i3-12100F', price: 2_200_000, socket: 'LGA1700', tdp: 58, hasIGPU: false, igpuScore: 0, gameScore: 85, boxCooler: true },
  { category: 'cpu', id: 'cpu-5600', name: 'AMD Ryzen 5 5600', price: 3_000_000, socket: 'AM4', tdp: 65, hasIGPU: false, igpuScore: 0, gameScore: 100, boxCooler: true },
  { category: 'cpu', id: 'cpu-12400f', name: 'Intel Core i5-12400F', price: 3_200_000, socket: 'LGA1700', tdp: 65, hasIGPU: false, igpuScore: 0, gameScore: 105, boxCooler: true },
  { category: 'cpu', id: 'cpu-7600', name: 'AMD Ryzen 5 7600', price: 5_200_000, socket: 'AM5', tdp: 65, hasIGPU: true, igpuScore: 8, gameScore: 135, boxCooler: true },
  { category: 'cpu', id: 'cpu-14600k', name: 'Intel Core i5-14600K', price: 8_000_000, socket: 'LGA1700', tdp: 150, hasIGPU: true, igpuScore: 7, gameScore: 155, boxCooler: false },
  { category: 'cpu', id: 'cpu-7800x3d', name: 'AMD Ryzen 7 7800X3D', price: 11_500_000, socket: 'AM5', tdp: 120, hasIGPU: true, igpuScore: 8, gameScore: 185, boxCooler: false },

  // Mainboard
  { category: 'mainboard', id: 'mb-h610m', name: 'ASUS PRIME H610M-K D4', price: 1_900_000, socket: 'LGA1700', ramType: 'DDR4', formFactor: 'mATX' },
  { category: 'mainboard', id: 'mb-b550m', name: 'MSI B550M PRO-VDH WIFI', price: 2_600_000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
  { category: 'mainboard', id: 'mb-b760', name: 'MSI PRO B760-P WIFI', price: 4_200_000, socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' },
  { category: 'mainboard', id: 'mb-b650', name: 'GIGABYTE B650 GAMING X AX', price: 4_600_000, socket: 'AM5', ramType: 'DDR5', formFactor: 'ATX' },

  // RAM
  { category: 'ram', id: 'ram-d4-8', name: 'Kingston Fury 8GB DDR4 3200', price: 450_000, ramType: 'DDR4', totalGB: 8, sticks: 1 },
  { category: 'ram', id: 'ram-d4-16', name: 'Corsair Vengeance 16GB DDR4 3200', price: 900_000, ramType: 'DDR4', totalGB: 16, sticks: 2 },
  { category: 'ram', id: 'ram-d5-16', name: 'Kingston Fury 16GB DDR5 5600', price: 1_500_000, ramType: 'DDR5', totalGB: 16, sticks: 2 },
  { category: 'ram', id: 'ram-d5-32', name: 'G.Skill Trident Z5 32GB DDR5 6000', price: 2_900_000, ramType: 'DDR5', totalGB: 32, sticks: 2 },

  // GPU
  { category: 'gpu', id: 'gpu-1650', name: 'NVIDIA GTX 1650', price: 3_600_000, vramGB: 4, powerW: 75, score: 45 },
  { category: 'gpu', id: 'gpu-3060', name: 'NVIDIA RTX 3060', price: 7_200_000, vramGB: 12, powerW: 170, score: 100 },
  { category: 'gpu', id: 'gpu-4060', name: 'NVIDIA RTX 4060', price: 8_000_000, vramGB: 8, powerW: 115, score: 120 },
  { category: 'gpu', id: 'gpu-7800xt', name: 'AMD RX 7800 XT', price: 14_500_000, vramGB: 16, powerW: 263, score: 215 },
  { category: 'gpu', id: 'gpu-4070s', name: 'NVIDIA RTX 4070 SUPER', price: 17_000_000, vramGB: 12, powerW: 220, score: 225 },
  { category: 'gpu', id: 'gpu-4090', name: 'NVIDIA RTX 4090', price: 55_000_000, vramGB: 24, powerW: 450, score: 400 },

  // SSD
  { category: 'ssd', id: 'ssd-500', name: 'Kingston NV2 500GB', price: 900_000, capacityGB: 500 },
  { category: 'ssd', id: 'ssd-1000', name: 'Samsung 980 1TB', price: 1_900_000, capacityGB: 1000 },
  { category: 'ssd', id: 'ssd-2000', name: 'Samsung 990 PRO 2TB', price: 4_500_000, capacityGB: 2000 },

  // PSU
  { category: 'psu', id: 'psu-450', name: 'Cooler Master Elite 450W', price: 800_000, watt: 450, rating: '80 Plus' },
  { category: 'psu', id: 'psu-650', name: 'Corsair CX650 650W', price: 1_500_000, watt: 650, rating: '80 Plus Bronze' },
  { category: 'psu', id: 'psu-850', name: 'Corsair RM850e 850W', price: 3_000_000, watt: 850, rating: '80 Plus Gold' },
  { category: 'psu', id: 'psu-1000', name: 'MSI MPG A1000G 1000W', price: 4_500_000, watt: 1000, rating: '80 Plus Gold' },

  // Case
  { category: 'case', id: 'case-matx', name: 'Xigmatek NYX 3F (mATX)', price: 700_000, supported: ['mATX'], maxCoolerMm: 155, radiators: [240], fanSlots: 4 },
  { category: 'case', id: 'case-atx', name: 'NZXT H5 Flow (ATX)', price: 1_600_000, supported: ['ATX', 'mATX'], maxCoolerMm: 165, radiators: [240, 280], fanSlots: 6 },
  { category: 'case', id: 'case-atx-pro', name: 'Lian Li O11 Dynamic (ATX)', price: 3_500_000, supported: ['ATX', 'mATX'], maxCoolerMm: 155, radiators: [240, 280, 360], fanSlots: 9 },

  // Tản nhiệt CPU
  { category: 'cooler', id: 'cool-ak400', name: 'DeepCool AK400', price: 650_000, coolerType: 'air', sockets: ['LGA1700', 'AM4', 'AM5'], maxTdp: 220, heightMm: 155, radiatorMm: 0 },
  { category: 'cooler', id: 'cool-pa120', name: 'Thermalright Peerless Assassin 120 SE', price: 950_000, coolerType: 'air', sockets: ['LGA1700', 'AM4', 'AM5'], maxTdp: 245, heightMm: 157, radiatorMm: 0 },
  { category: 'cooler', id: 'cool-lf360', name: 'Arctic Liquid Freezer III 360', price: 2_800_000, coolerType: 'aio', sockets: ['LGA1700', 'AM4', 'AM5'], maxTdp: 300, heightMm: 0, radiatorMm: 360 },

  // Ổ cứng thêm
  { category: 'drive', id: 'drv-hdd-1t', name: 'Seagate BarraCuda 1TB HDD', price: 1_100_000, kind: 'hdd', capacityGB: 1000, powerW: 7 },
  { category: 'drive', id: 'drv-hdd-2t', name: 'WD Blue 2TB HDD', price: 1_500_000, kind: 'hdd', capacityGB: 2000, powerW: 7 },
  { category: 'drive', id: 'drv-ssd-1t', name: 'Crucial MX500 1TB SATA SSD', price: 1_600_000, kind: 'ssd', capacityGB: 1000, powerW: 3 },

  // Quạt case
  { category: 'fan', id: 'fan-p12', name: 'Arctic P12 PWM', price: 150_000, sizeMm: 120, powerW: 2 },
  { category: 'fan', id: 'fan-sl120', name: 'Lian Li UNI Fan SL120 V2 ARGB', price: 750_000, sizeMm: 120, powerW: 4 },

  // Màn hình
  { category: 'monitor', id: 'mon-24-75', name: 'LG 24MK600M 24"', price: 2_300_000, resolution: '1080p', refreshHz: 75, sizeInch: 24, panel: 'IPS' },
  { category: 'monitor', id: 'mon-24-180', name: 'ASUS TUF VG249Q3A 24"', price: 3_500_000, resolution: '1080p', refreshHz: 180, sizeInch: 24, panel: 'IPS' },
  { category: 'monitor', id: 'mon-27-1440', name: 'Gigabyte M27Q 27"', price: 6_500_000, resolution: '1440p', refreshHz: 170, sizeInch: 27, panel: 'IPS' },
  { category: 'monitor', id: 'mon-27-4k', name: 'LG UltraGear 27GR93U 27"', price: 12_500_000, resolution: '4K', refreshHz: 144, sizeInch: 27, panel: 'IPS' },
];

/** Danh mục đang dùng. Ban đầu là danh mục đi kèm; `setCatalog` thay bằng dữ liệu máy chủ. */
export const PARTS: Part[] = [...BUILTIN_PARTS];

export const PART_BY_ID = new Map<string, Part>(PARTS.map((p) => [p.id, p]));

/** Thay toàn bộ danh mục đang dùng. Sửa tại chỗ để mọi nơi đã import đều thấy dữ liệu mới. */
export function setCatalog(parts: readonly Part[]): void {
  PARTS.splice(0, PARTS.length, ...parts);
  PART_BY_ID.clear();
  for (const p of PARTS) PART_BY_ID.set(p.id, p);
}

export function partsOf(category: Category): Part[] {
  return PARTS.filter((p) => p.category === category);
}

function find<C extends Category>(id: unknown, category: C): Extract<Part, { category: C }> | undefined {
  if (typeof id !== 'string') return undefined;
  const part = PART_BY_ID.get(id);
  return part?.category === category ? (part as Extract<Part, { category: C }>) : undefined;
}

const clampQty = (n: unknown) => Math.min(MAX_FANS, Math.max(1, Math.round(Number(n)) || 1));

/**
 * Chỉ giữ lại các id trỏ tới linh kiện có thật và đúng loại; tối đa MAX_DRIVES ổ thêm,
 * số quạt từ 1 tới MAX_FANS. Trả về cả số món bị bỏ.
 */
export function sanitizeIds(ids: unknown): { build: BuildIds; dropped: number } {
  const src = (ids && typeof ids === 'object' ? ids : {}) as Record<string, unknown>;
  const build: BuildIds = {};
  let dropped = 0;
  for (const c of SINGLE) {
    const id = src[c];
    if (!id) continue;
    if (find(id, c)) build[c] = id as string;
    else dropped++;
  }
  if (Array.isArray(src.drive)) {
    const drives = src.drive.filter((id) => find(id, 'drive')) as string[];
    dropped += src.drive.length - drives.length;
    if (drives.length > MAX_DRIVES) dropped += drives.length - MAX_DRIVES;
    if (drives.length) build.drive = drives.slice(0, MAX_DRIVES);
  }
  const fan = src.fan as Partial<FanPick> | undefined;
  if (fan && typeof fan === 'object') {
    if (find(fan.id, 'fan')) build.fan = { id: fan.id as string, qty: clampQty(fan.qty) };
    else dropped++;
  }
  return { build, dropped };
}

export function resolveBuild(ids: BuildIds): Build {
  const build: Build = {};
  for (const c of SINGLE) {
    const part = find(ids[c], c);
    if (part) (build as Record<string, Part>)[c] = part;
  }
  const drives = (ids.drive ?? []).map((id) => find(id, 'drive')).filter((d): d is Drive => !!d);
  if (drives.length) build.drive = drives.slice(0, MAX_DRIVES);
  const fan = find(ids.fan?.id, 'fan');
  if (fan) build.fan = { part: fan, qty: clampQty(ids.fan?.qty) };
  return build;
}

/** Mọi linh kiện trong build kèm số lượng, theo thứ tự CATEGORIES. */
export function buildItems(build: Build): { part: Part; qty: number }[] {
  const items: { part: Part; qty: number }[] = [];
  for (const c of CATEGORIES) {
    if (c.id === 'drive') build.drive?.forEach((d) => items.push({ part: d, qty: 1 }));
    else if (c.id === 'fan') {
      if (build.fan) items.push({ part: build.fan.part, qty: build.fan.qty });
    } else {
      const part = build[c.id];
      if (part) items.push({ part, qty: 1 });
    }
  }
  return items;
}

/** Loại này đã có linh kiện trong build chưa. */
export function hasCategory(build: Build, c: Category): boolean {
  if (c === 'drive') return !!build.drive?.length;
  return !!build[c];
}

/** Số loại bắt buộc đã chọn (trên tổng REQUIRED_CATEGORIES). */
export function requiredCount(build: Build): number {
  return REQUIRED_CATEGORIES.filter((c) => hasCategory(build, c)).length;
}

/** Tổng giá các linh kiện đang chọn (tính cả số lượng quạt), theo giá trong danh mục hiện tại. */
export function buildPrice(ids: BuildIds): number {
  return buildItems(resolveBuild(ids)).reduce((sum, { part, qty }) => sum + part.price * qty, 0);
}

const gb = (n: number) => (n >= 1000 ? n / 1000 + 'TB' : n + 'GB');

export function specLine(p: Part): string {
  switch (p.category) {
    case 'cpu':
      return `Socket ${p.socket} · ${p.tdp}W · ${p.hasIGPU ? 'Có iGPU' : 'Không iGPU'}${p.boxCooler ? ' · Kèm quạt' : ''}`;
    case 'mainboard':
      return `Socket ${p.socket} · ${p.ramType} · ${p.formFactor}`;
    case 'ram':
      return `${p.ramType} · ${p.totalGB}GB (${p.sticks} thanh)`;
    case 'gpu':
      return `${p.vramGB}GB VRAM · ${p.powerW}W`;
    case 'ssd':
      return `${gb(p.capacityGB)} NVMe`;
    case 'psu':
      return `${p.watt}W · ${p.rating}`;
    case 'case': {
      const extra = [
        p.maxCoolerMm ? `tản ≤ ${p.maxCoolerMm}mm` : '',
        p.radiators?.length ? `rad ${p.radiators.join('/')}` : '',
        p.fanSlots ? `${p.fanSlots} quạt` : '',
      ].filter(Boolean);
      return `Hỗ trợ main ${p.supported.join(', ')}${extra.length ? ' · ' + extra.join(' · ') : ''}`;
    }
    case 'cooler':
      return p.coolerType === 'aio'
        ? `Tản nước rad ${p.radiatorMm}mm · ${p.maxTdp}W · ${p.sockets.join('/')}`
        : `Tản khí cao ${p.heightMm}mm · ${p.maxTdp}W · ${p.sockets.join('/')}`;
    case 'drive':
      return `${p.kind === 'hdd' ? 'HDD' : 'SSD SATA'} ${gb(p.capacityGB)} · ${p.powerW}W`;
    case 'fan':
      return `${p.sizeMm}mm · ${p.powerW}W`;
    case 'monitor':
      return `${p.sizeInch}" · ${p.resolution} · ${p.refreshHz}Hz · ${p.panel}`;
  }
}
