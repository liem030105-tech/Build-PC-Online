export type Category = 'cpu' | 'mainboard' | 'ram' | 'gpu' | 'ssd' | 'psu' | 'case';
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
}

export type Part = Cpu | Mainboard | Ram | Gpu | Ssd | Psu | Case;

export interface Build {
  cpu?: Cpu;
  mainboard?: Mainboard;
  ram?: Ram;
  gpu?: Gpu;
  ssd?: Ssd;
  psu?: Psu;
  case?: Case;
}

export type BuildIds = Partial<Record<Category, string>>;

export interface CategoryMeta {
  id: Category;
  label: string;
  /** Chữ ngắn in trên biển kệ hàng. */
  short: string;
  color: number;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'cpu', label: 'CPU', short: 'CPU', color: 0x41a6f6 },
  { id: 'mainboard', label: 'Mainboard', short: 'MAIN', color: 0x38b764 },
  { id: 'ram', label: 'RAM', short: 'RAM', color: 0xffcd75 },
  { id: 'gpu', label: 'Card đồ họa', short: 'GPU', color: 0xb13e53 },
  { id: 'ssd', label: 'Ổ cứng SSD', short: 'SSD', color: 0x73eff7 },
  { id: 'psu', label: 'Nguồn', short: 'NGUỒN', color: 0xef7d57 },
  { id: 'case', label: 'Vỏ case', short: 'CASE', color: 0x94b0c2 },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  Category,
  CategoryMeta
>;

/** Danh mục đi kèm trò chơi: dùng khi không tải được danh mục từ máy chủ. */
export const BUILTIN_PARTS: readonly Part[] = [
  // CPU
  { category: 'cpu', id: 'cpu-12100f', name: 'Intel Core i3-12100F', price: 2_200_000, socket: 'LGA1700', tdp: 58, hasIGPU: false, igpuScore: 0, gameScore: 85 },
  { category: 'cpu', id: 'cpu-5600', name: 'AMD Ryzen 5 5600', price: 3_000_000, socket: 'AM4', tdp: 65, hasIGPU: false, igpuScore: 0, gameScore: 100 },
  { category: 'cpu', id: 'cpu-12400f', name: 'Intel Core i5-12400F', price: 3_200_000, socket: 'LGA1700', tdp: 65, hasIGPU: false, igpuScore: 0, gameScore: 105 },
  { category: 'cpu', id: 'cpu-7600', name: 'AMD Ryzen 5 7600', price: 5_200_000, socket: 'AM5', tdp: 65, hasIGPU: true, igpuScore: 8, gameScore: 135 },
  { category: 'cpu', id: 'cpu-14600k', name: 'Intel Core i5-14600K', price: 8_000_000, socket: 'LGA1700', tdp: 150, hasIGPU: true, igpuScore: 7, gameScore: 155 },
  { category: 'cpu', id: 'cpu-7800x3d', name: 'AMD Ryzen 7 7800X3D', price: 11_500_000, socket: 'AM5', tdp: 120, hasIGPU: true, igpuScore: 8, gameScore: 185 },

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
  { category: 'case', id: 'case-matx', name: 'Xigmatek NYX 3F (mATX)', price: 700_000, supported: ['mATX'] },
  { category: 'case', id: 'case-atx', name: 'NZXT H5 Flow (ATX)', price: 1_600_000, supported: ['ATX', 'mATX'] },
  { category: 'case', id: 'case-atx-pro', name: 'Lian Li O11 Dynamic (ATX)', price: 3_500_000, supported: ['ATX', 'mATX'] },
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

export function resolveBuild(ids: BuildIds): Build {
  const build: Record<string, Part> = {};
  for (const c of CATEGORIES) {
    const id = ids[c.id];
    const part = id ? PART_BY_ID.get(id) : undefined;
    if (part && part.category === c.id) build[c.id] = part;
  }
  return build as Build;
}

/** Tổng giá các linh kiện đang lắp, theo giá trong danh mục hiện tại. */
export function buildPrice(ids: BuildIds): number {
  return CATEGORIES.reduce((sum, c) => sum + (PART_BY_ID.get(ids[c.id] ?? '')?.price ?? 0), 0);
}

export function specLine(p: Part): string {
  switch (p.category) {
    case 'cpu':
      return `Socket ${p.socket} · ${p.tdp}W · ${p.hasIGPU ? 'Có iGPU' : 'Không iGPU'}`;
    case 'mainboard':
      return `Socket ${p.socket} · ${p.ramType} · ${p.formFactor}`;
    case 'ram':
      return `${p.ramType} · ${p.totalGB}GB (${p.sticks} thanh)`;
    case 'gpu':
      return `${p.vramGB}GB VRAM · ${p.powerW}W`;
    case 'ssd':
      return `${p.capacityGB >= 1000 ? p.capacityGB / 1000 + 'TB' : p.capacityGB + 'GB'} NVMe`;
    case 'psu':
      return `${p.watt}W · ${p.rating}`;
    case 'case':
      return `Hỗ trợ main ${p.supported.join(', ')}`;
  }
}
