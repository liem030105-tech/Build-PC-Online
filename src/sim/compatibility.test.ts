import { describe, expect, it } from 'vitest';
import { PART_BY_ID, resolveBuild, type BuildIds, type Part } from '../data/parts';
import { checkBuild, partConflicts, requiredWatt } from './compatibility';

const VALID: BuildIds = {
  cpu: 'cpu-7600',
  mainboard: 'mb-b650',
  ram: 'ram-d5-16',
  gpu: 'gpu-4060',
  ssd: 'ssd-1000',
  psu: 'psu-650',
  case: 'case-atx',
};

const check = (ids: BuildIds) => checkBuild(resolveBuild(ids));

describe('checkBuild', () => {
  it('chấp nhận cấu hình hợp lệ', () => {
    expect(check(VALID)).toEqual({ ok: true, errors: [], missing: [], conflicts: [] });
  });

  it('báo thiếu từng linh kiện bắt buộc', () => {
    const r = check({});
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(7);
    expect(r.missing).toEqual(['cpu', 'mainboard', 'ram', 'gpu', 'ssd', 'psu', 'case']);
    expect(r.conflicts).toEqual([]);
  });

  it('tách khe còn trống và xung đột thành hai danh sách', () => {
    const r = check({ cpu: 'cpu-7600', mainboard: 'mb-b760', ram: 'ram-d4-16' });
    expect(r.missing).toEqual(['ssd', 'psu', 'case']);
    expect(r.conflicts).toHaveLength(2);
    expect(r.errors).toHaveLength(5);
  });

  it('cho phép thiếu GPU khi CPU có iGPU', () => {
    expect(check({ ...VALID, gpu: undefined }).ok).toBe(true);
  });

  it('báo lỗi thiếu GPU khi CPU không có iGPU', () => {
    const r = check({
      ...VALID,
      cpu: 'cpu-12400f',
      mainboard: 'mb-b760',
      gpu: undefined,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('không có iGPU');
  });

  it('báo lỗi socket CPU khác mainboard', () => {
    const r = check({ ...VALID, mainboard: 'mb-b760' });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('socket AM5');
    expect(r.errors[0]).toContain('LGA1700');
  });

  it('báo lỗi loại RAM khác mainboard', () => {
    const r = check({ ...VALID, ram: 'ram-d4-16' });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('DDR4');
    expect(r.errors[0]).toContain('DDR5');
  });

  it('báo lỗi mainboard ATX không vừa vỏ mATX', () => {
    const r = check({ ...VALID, case: 'case-matx' });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('không vừa');
  });

  it('cho mainboard mATX lắp vào vỏ ATX', () => {
    const r = check({
      cpu: 'cpu-5600',
      mainboard: 'mb-b550m',
      ram: 'ram-d4-16',
      gpu: 'gpu-3060',
      ssd: 'ssd-500',
      psu: 'psu-650',
      case: 'case-atx',
    });
    expect(r.ok).toBe(true);
  });

  it('báo lỗi nguồn không đủ công suất', () => {
    const r = check({ ...VALID, cpu: 'cpu-7800x3d', gpu: 'gpu-4090', psu: 'psu-650' });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('804W');
  });

  it('chấp nhận nguồn vừa đủ công suất', () => {
    expect(check({ ...VALID, cpu: 'cpu-7800x3d', gpu: 'gpu-4090', psu: 'psu-850' }).ok).toBe(true);
  });
});

describe('requiredWatt', () => {
  it('tính (CPU + GPU + 100) dư 20%', () => {
    expect(requiredWatt(resolveBuild({ cpu: 'cpu-7600', gpu: 'gpu-4060' }))).toBe(336);
    expect(requiredWatt(resolveBuild({ cpu: 'cpu-7600' }))).toBe(198);
  });
});

describe('partConflicts', () => {
  const part = (id: string) => PART_BY_ID.get(id) as Part;

  it('không báo gì khi build còn trống', () => {
    expect(partConflicts({}, part('cpu-5600'))).toEqual([]);
  });

  it('báo CPU khác socket với mainboard đã chọn', () => {
    const build = resolveBuild({ mainboard: 'mb-b650' });
    expect(partConflicts(build, part('cpu-7600'))).toEqual([]);
    expect(partConflicts(build, part('cpu-5600'))).toHaveLength(1);
  });

  it('đổi linh kiện cùng loại thì bỏ qua linh kiện cũ', () => {
    const build = resolveBuild({ cpu: 'cpu-5600', mainboard: 'mb-b650' });
    expect(partConflicts(build, part('cpu-7600'))).toEqual([]);
  });

  it('báo RAM sai loại và mainboard không vừa case', () => {
    expect(partConflicts(resolveBuild({ mainboard: 'mb-b550m' }), part('ram-d5-16'))).toHaveLength(1);
    expect(partConflicts(resolveBuild({ case: 'case-matx' }), part('mb-b650'))).toHaveLength(1);
  });

  it('báo nguồn yếu khi chọn card đồ họa ngốn điện', () => {
    const build = resolveBuild({ cpu: 'cpu-7600', psu: 'psu-450' });
    expect(partConflicts(build, part('gpu-4060'))).toEqual([]);
    expect(partConflicts(build, part('gpu-4090'))).toHaveLength(1);
  });

  it('không tính xung đột sẵn có giữa các linh kiện khác', () => {
    const build = resolveBuild({ cpu: 'cpu-5600', mainboard: 'mb-b650' });
    expect(partConflicts(build, part('ssd-1000'))).toEqual([]);
  });
});
