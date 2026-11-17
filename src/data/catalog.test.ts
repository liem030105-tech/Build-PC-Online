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
      id: 'cpu-x', category: 'cpu', name: 'CPU X', price: 100, socket: 'AM5', tdp: 65, hasIGPU: true, igpuScore: 8, gameScore: 135,
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
