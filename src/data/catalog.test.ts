import { describe, expect, it } from 'vitest';
import { partToRow, rowToPart, rowsToCatalog } from './catalog';
import { BUILTIN_PARTS } from './parts';

/** Dòng đúng như Xano trả về: có id, created_at và mọi cột không áp dụng là null. */
const xanoRow = (fields: Record<string, unknown>): Record<string, unknown> => ({
  id: 1,
  created_at: 1794851070035,
  socket: null,
  tdp: null,
  has_igpu: null,
  igpu_score: null,
  game_score: null,
  ram_type: null,
  form_factor: null,
  total_gb: null,
  sticks: null,
  vram_gb: null,
  power_w: null,
  score: null,
  capacity_gb: null,
  watt: null,
  rating: null,
  supported: null,
  ...fields,
});

describe('rowToPart', () => {
  it('đổi qua lại không mất dữ liệu với toàn bộ danh mục đi kèm', () => {
    for (const part of BUILTIN_PARTS) {
      expect(rowToPart(xanoRow({ ...partToRow(part) }))).toEqual(part);
    }
  });

  it('đọc dòng CPU từ Xano', () => {
    const row = xanoRow({ key: 'cpu-x', category: 'cpu', name: 'CPU X', price: 100, socket: 'AM5', tdp: 65, has_igpu: true, igpu_score: 8, game_score: 135 });
    expect(rowToPart(row)).toEqual({
      id: 'cpu-x', category: 'cpu', name: 'CPU X', price: 100, socket: 'AM5', tdp: 65, hasIGPU: true, igpuScore: 8, gameScore: 135, boxCooler: true,
    });
  });

  it('chấp nhận socket và loại RAM mới ngoài danh mục đi kèm', () => {
    const cpu = rowToPart(xanoRow({ key: 'cpu-n', category: 'cpu', name: 'N', price: 1, socket: 'LGA1851', tdp: 125, game_score: 200 }));
    const main = rowToPart(xanoRow({ key: 'mb-n', category: 'mainboard', name: 'N', price: 1, socket: 'LGA1851', ram_type: 'DDR5', form_factor: 'ITX' }));
    expect(cpu).toMatchObject({ socket: 'LGA1851', hasIGPU: false, igpuScore: 0 });
    expect(main).toMatchObject({ socket: 'LGA1851', formFactor: 'ITX' });
  });

  it('cắt khoảng trắng và không phân biệt hoa thường ở cột category', () => {
    const part = rowToPart(xanoRow({ key: ' ssd-x ', category: ' SSD ', name: ' Ổ X ', price: 5, capacity_gb: 500 }));
    expect(part).toEqual({ id: 'ssd-x', category: 'ssd', name: 'Ổ X', price: 5, capacityGB: 500 });
  });

  it('tách cột supported của vỏ case theo dấu phẩy', () => {
    const part = rowToPart(xanoRow({ key: 'case-x', category: 'case', name: 'Vỏ X', price: 5, supported: 'ATX, mATX ,' }));
    expect(part).toMatchObject({ supported: ['ATX', 'mATX'] });
  });

  it('bỏ qua điểm iGPU khi cột has_igpu bị tắt', () => {
    const part = rowToPart(xanoRow({ key: 'c', category: 'cpu', name: 'C', price: 1, socket: 'AM4', tdp: 65, has_igpu: false, igpu_score: 9, game_score: 100 }));
    expect(part).toMatchObject({ hasIGPU: false, igpuScore: 0 });
  });

  it('bỏ dòng thiếu thông số bắt buộc của loại đó', () => {
    const bad = [
      xanoRow({ key: 'cpu-bad', category: 'cpu', name: 'Thiếu socket', price: 1, tdp: 65, game_score: 100 }),
      xanoRow({ key: 'gpu-bad', category: 'gpu', name: 'Thiếu điểm', price: 1, power_w: 100 }),
      xanoRow({ key: 'psu-bad', category: 'psu', name: 'Công suất 0', price: 1, watt: 0 }),
      xanoRow({ key: 'ram-bad', category: 'ram', name: 'Thiếu số thanh', price: 1, ram_type: 'DDR5', total_gb: 16 }),
      xanoRow({ key: 'case-bad', category: 'case', name: 'Không nhận cỡ nào', price: 1, supported: ' ' }),
      xanoRow({ key: 'x', category: 'tản nhiệt', name: 'Loại lạ', price: 1 }),
      xanoRow({ key: '', category: 'ssd', name: 'Thiếu key', price: 1, capacity_gb: 500 }),
      xanoRow({ key: 'ssd-neg', category: 'ssd', name: 'Giá âm', price: -1, capacity_gb: 500 }),
      xanoRow({ key: 'ssd-str', category: 'ssd', name: 'Giá là chữ', price: '100', capacity_gb: 500 }),
      null,
      'không phải object',
    ];
    for (const row of bad) expect(rowToPart(row)).toBeNull();
  });
});

describe('rowsToCatalog', () => {
  const rows = BUILTIN_PARTS.map((p) => xanoRow({ ...partToRow(p) }));

  it('đọc đủ danh mục khi mọi dòng hợp lệ', () => {
    const result = rowsToCatalog(rows);
    expect(result.parts).toEqual([...BUILTIN_PARTS]);
    expect(result.skipped).toBe(0);
    expect(result.missing).toEqual([]);
  });

  it('bỏ dòng hỏng và dòng trùng key nhưng giữ phần còn lại', () => {
    const result = rowsToCatalog([...rows, rows[0], xanoRow({ key: 'bad', category: 'cpu', name: 'Hỏng', price: 1 })]);
    expect(result.parts).toHaveLength(BUILTIN_PARTS.length);
    expect(result.skipped).toBe(2);
  });

  it('báo loại linh kiện bị thiếu hẳn', () => {
    const result = rowsToCatalog(rows.filter((r) => r.category !== 'psu' && r.category !== 'case'));
    expect(result.missing).toEqual(['psu', 'case']);
  });

  it('coi dữ liệu không phải mảng là danh mục rỗng', () => {
    const result = rowsToCatalog({ message: 'error' });
    expect(result.parts).toEqual([]);
    expect(result.missing).toHaveLength(7);
  });
});

describe('rowToPart: linh kiện tuỳ chọn và cột mới', () => {
  it('đoán CPU kèm quạt theo TDP khi bỏ trống cột box_cooler', () => {
    const base = { category: 'cpu', name: 'C', price: 1, socket: 'AM5', game_score: 100 };
    expect(rowToPart(xanoRow({ ...base, key: 'a', tdp: 65 }))).toMatchObject({ boxCooler: true });
    expect(rowToPart(xanoRow({ ...base, key: 'b', tdp: 120 }))).toMatchObject({ boxCooler: false });
    expect(rowToPart(xanoRow({ ...base, key: 'c', tdp: 120, box_cooler: true }))).toMatchObject({ boxCooler: true });
  });

  it('đọc thông số tản nhiệt của case', () => {
    const part = rowToPart(
      xanoRow({ key: 'cs', category: 'case', name: 'C', price: 1, supported: 'ATX', max_cooler_mm: 160, radiators: '240, 360', fan_slots: 7 }),
    );
    expect(part).toMatchObject({ maxCoolerMm: 160, radiators: [240, 360], fanSlots: 7 });
  });

  it('đọc tản khí, tản nước, ổ thêm, quạt, màn hình', () => {
    const air = rowToPart(xanoRow({ key: 'c1', category: 'cooler', name: 'A', price: 1, cooler_type: 'AIR', sockets: 'AM5,LGA1700', max_tdp: 200, height_mm: 150 }));
    const aio = rowToPart(xanoRow({ key: 'c2', category: 'cooler', name: 'B', price: 1, cooler_type: 'aio', sockets: 'AM5', max_tdp: 300, radiator_mm: 240 }));
    const drive = rowToPart(xanoRow({ key: 'd', category: 'drive', name: 'D', price: 1, kind: 'HDD', capacity_gb: 2000, power_w: 7 }));
    const fan = rowToPart(xanoRow({ key: 'f', category: 'fan', name: 'F', price: 1, size_mm: 140 }));
    const mon = rowToPart(xanoRow({ key: 'm', category: 'monitor', name: 'M', price: 1, resolution: '4k', refresh_hz: 144, size_inch: 27, panel: 'IPS' }));
    expect(air).toMatchObject({ coolerType: 'air', sockets: ['AM5', 'LGA1700'], heightMm: 150, radiatorMm: 0 });
    expect(aio).toMatchObject({ coolerType: 'aio', radiatorMm: 240 });
    expect(drive).toMatchObject({ kind: 'hdd', capacityGB: 2000, powerW: 7 });
    expect(fan).toMatchObject({ sizeMm: 140, powerW: 0 });
    expect(mon).toMatchObject({ resolution: '4K', refreshHz: 144 });
  });

  it('bỏ dòng tuỳ chọn thiếu thông số bắt buộc', () => {
    expect(rowToPart(xanoRow({ key: 'c', category: 'cooler', name: 'A', price: 1, cooler_type: 'air', sockets: 'AM5', max_tdp: 200 }))).toBeNull();
    expect(rowToPart(xanoRow({ key: 'm', category: 'monitor', name: 'M', price: 1, resolution: '8K', refresh_hz: 60 }))).toBeNull();
    expect(rowToPart(xanoRow({ key: 'd', category: 'drive', name: 'D', price: 1, kind: 'nvme', capacity_gb: 1 }))).toBeNull();
  });

  it('mọi linh kiện đi kèm đổi qua lại dòng Xano không mất thông tin', () => {
    for (const p of BUILTIN_PARTS) expect(rowToPart(xanoRow({ ...partToRow(p) }))).toEqual(p);
  });

  it('danh mục máy chủ chưa có loại tuỳ chọn vẫn dùng được', () => {
    const rows = BUILTIN_PARTS.filter((p) => !['cooler', 'drive', 'fan', 'monitor'].includes(p.category)).map(partToRow);
    expect(rowsToCatalog(rows).missing).toEqual([]);
  });
});
