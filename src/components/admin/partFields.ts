import type { PartRow } from '@/data/catalog';
import { RESOLUTIONS, type Category } from '@/data/parts';

export interface FieldDef {
  key: keyof PartRow;
  label: string;
  type: 'text' | 'number' | 'bool' | 'select';
  options?: { value: string; label: string }[];
  /** Ghi chú nhỏ dưới ô nhập. */
  hint?: string;
  placeholder?: string;
}

const yes = (key: keyof PartRow, label: string, hint?: string): FieldDef => ({ key, label, type: 'bool', hint });
const n = (key: keyof PartRow, label: string, hint?: string): FieldDef => ({ key, label, type: 'number', hint });
const t = (key: keyof PartRow, label: string, placeholder?: string, hint?: string): FieldDef => ({
  key,
  label,
  type: 'text',
  placeholder,
  hint,
});

/** Các ô nhập riêng của từng loại linh kiện (ngoài mã, tên, giá dùng chung). */
export const PART_FIELDS: Record<Category, FieldDef[]> = {
  cpu: [
    t('socket', 'Socket', 'AM5, LGA1700…'),
    n('tdp', 'TDP (W)'),
    n('game_score', 'Điểm chơi game', '100 = Ryzen 5 5600'),
    yes('has_igpu', 'Có đồ họa tích hợp (iGPU)'),
    n('igpu_score', 'Điểm iGPU', 'Cùng thang với điểm card đồ họa; 0 nếu không có'),
    yes('box_cooler', 'Kèm quạt trong hộp'),
  ],
  mainboard: [
    t('socket', 'Socket', 'AM5, LGA1700…'),
    t('ram_type', 'Loại RAM', 'DDR4, DDR5'),
    t('form_factor', 'Kích thước', 'ATX, mATX, ITX'),
  ],
  ram: [t('ram_type', 'Loại RAM', 'DDR4, DDR5'), n('total_gb', 'Tổng dung lượng (GB)'), n('sticks', 'Số thanh')],
  gpu: [n('vram_gb', 'VRAM (GB)'), n('power_w', 'Công suất (W)'), n('score', 'Điểm đồ họa', '100 = RTX 3060')],
  ssd: [n('capacity_gb', 'Dung lượng (GB)')],
  psu: [n('watt', 'Công suất (W)'), t('rating', 'Chuẩn hiệu suất', '80 Plus Gold')],
  case: [
    t('supported', 'Mainboard hỗ trợ', 'ATX,mATX', 'Cách nhau bằng dấu phẩy'),
    n('max_cooler_mm', 'Tản khí cao tối đa (mm)'),
    t('radiators', 'Cỡ rad tản nước', '240,280,360', 'Cách nhau bằng dấu phẩy; để trống nếu không rõ'),
    n('fan_slots', 'Số vị trí quạt'),
  ],
  cooler: [
    {
      key: 'cooler_type',
      label: 'Loại tản',
      type: 'select',
      options: [
        { value: 'air', label: 'Tản khí' },
        { value: 'aio', label: 'Tản nước AIO' },
      ],
    },
    t('sockets', 'Socket hỗ trợ', 'LGA1700,AM4,AM5', 'Cách nhau bằng dấu phẩy'),
    n('max_tdp', 'Tản tối đa (W)'),
    n('height_mm', 'Chiều cao (mm)', 'Chỉ cho tản khí'),
    n('radiator_mm', 'Cỡ rad (mm)', 'Chỉ cho tản nước: 240, 280, 360'),
  ],
  drive: [
    {
      key: 'kind',
      label: 'Loại ổ',
      type: 'select',
      options: [
        { value: 'hdd', label: 'HDD' },
        { value: 'ssd', label: 'SSD SATA' },
      ],
    },
    n('capacity_gb', 'Dung lượng (GB)'),
    n('power_w', 'Công suất (W)'),
  ],
  fan: [n('size_mm', 'Kích thước (mm)'), n('power_w', 'Công suất (W)')],
  monitor: [
    {
      key: 'resolution',
      label: 'Độ phân giải',
      type: 'select',
      options: RESOLUTIONS.map((r) => ({ value: r, label: r })),
    },
    n('refresh_hz', 'Tần số quét (Hz)'),
    n('size_inch', 'Kích thước (inch)'),
    t('panel', 'Tấm nền', 'IPS, VA, OLED'),
  ],
};

/** Mọi cột của bảng `part` ngoài mã/loại/tên/giá, để gửi đủ khi sửa. */
export const ALL_SPEC_KEYS: (keyof PartRow)[] = [
  ...new Set(Object.values(PART_FIELDS).flatMap((fields) => fields.map((f) => f.key))),
];

/** Gợi ý mã linh kiện từ loại và tên: "cpu" + "Ryzen 5 7600X" → "cpu-ryzen-5-7600x". */
export function suggestKey(category: string, name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug ? `${category}-${slug}` : '';
}
