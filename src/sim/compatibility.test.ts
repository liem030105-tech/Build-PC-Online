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
const part = (id: string) => PART_BY_ID.get(id) as Part;

describe('checkBuild', () => {
  it('chấp nhận cấu hình hợp lệ', () => {
    expect(check(VALID)).toEqual({ ok: true, errors: [], missing: [], conflicts: [], warnings: [] });
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
    const r = check({ ...VALID, cpu: 'cpu-7800x3d', cooler: 'cool-ak400', gpu: 'gpu-4090', psu: 'psu-650' });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('804W');
  });

  it('chấp nhận nguồn vừa đủ công suất', () => {
    expect(check({ ...VALID, cpu: 'cpu-7800x3d', cooler: 'cool-ak400', gpu: 'gpu-4090', psu: 'psu-850' }).ok).toBe(true);
  });
});

describe('requiredWatt', () => {
  it('tính (CPU + GPU + 100) dư 20%', () => {
    expect(requiredWatt(resolveBuild({ cpu: 'cpu-7600', gpu: 'gpu-4060' }))).toBe(336);
    expect(requiredWatt(resolveBuild({ cpu: 'cpu-7600' }))).toBe(198);
  });
});

describe('partConflicts', () => {

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

describe('linh kiện tuỳ chọn: tản nhiệt, quạt, ổ thêm', () => {
  const BASE: BuildIds = { ...VALID, cpu: 'cpu-14600k', mainboard: 'mb-b760', psu: 'psu-850' };

  it('CPU không kèm quạt mà chưa có tản thì báo thiếu tản nhiệt', () => {
    const r = check(BASE);
    expect(r.missing).toEqual(['cooler']);
    expect(r.errors[0]).toContain('không kèm quạt');
    expect(check({ ...BASE, cooler: 'cool-ak400' }).ok).toBe(true);
  });

  it('CPU kèm quạt thì không cần tản rời', () => {
    expect(check(VALID).missing).not.toContain('cooler');
  });

  it('báo tản khí cao hơn giới hạn của case', () => {
    const r = check({ ...BASE, cooler: 'cool-pa120', case: 'case-atx-pro' });
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toContain('157mm');
    expect(check({ ...BASE, cooler: 'cool-pa120', case: 'case-atx' }).ok).toBe(true);
  });

  it('báo rad tản nước không vừa case', () => {
    expect(check({ ...BASE, cooler: 'cool-lf360', case: 'case-atx' }).conflicts[0]).toContain('360mm');
    expect(check({ ...BASE, cooler: 'cool-lf360', case: 'case-atx-pro' }).ok).toBe(true);
  });

  it('báo tản không đủ TDP hoặc khác socket', () => {
    const weak = { ...PART_BY_ID.get('cool-ak400')!, maxTdp: 100 } as Part;
    expect(partConflicts(resolveBuild(BASE), weak)[0]).toContain('100W');
    const amOnly = { ...PART_BY_ID.get('cool-ak400')!, sockets: ['AM5'] } as Part;
    expect(partConflicts(resolveBuild(BASE), amOnly)[0]).toContain('LGA1700');
  });

  it('báo quá số vị trí quạt của case', () => {
    expect(check({ ...VALID, case: 'case-matx', mainboard: 'mb-b550m', cpu: 'cpu-5600', ram: 'ram-d4-16', fan: { id: 'fan-p12', qty: 5 } }).conflicts[0]).toContain('4 vị trí');
    expect(check({ ...VALID, fan: { id: 'fan-p12', qty: 6 } }).ok).toBe(true);
  });

  it('cộng công suất ổ thêm và quạt vào công suất cần', () => {
    const base = requiredWatt(resolveBuild({ cpu: 'cpu-7600', gpu: 'gpu-4060' }));
    const extra = requiredWatt(
      resolveBuild({ cpu: 'cpu-7600', gpu: 'gpu-4060', drive: ['drv-hdd-1t', 'drv-ssd-1t'], fan: { id: 'fan-p12', qty: 3 } }),
    );
    expect(base).toBe(336);
    expect(extra).toBe(Math.ceil((65 + 115 + 7 + 3 + 6 + 100) * 1.2));
  });

  it('khuyên dùng nguồn dư hơn khi sát công suất cần', () => {
    const r = check({ ...BASE, cooler: 'cool-ak400', gpu: 'gpu-7800xt', psu: 'psu-650' });
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toContain('khá sát');
  });

  it('ổ cứng thêm không gây xung đột, quạt giữ số lượng khi đổi mẫu', () => {
    expect(partConflicts(resolveBuild(VALID), part('drv-hdd-2t'))).toEqual([]);
    const build = resolveBuild({ ...VALID, case: 'case-matx', mainboard: 'mb-b550m', cpu: 'cpu-5600', ram: 'ram-d4-16', fan: { id: 'fan-p12', qty: 4 } });
    expect(partConflicts(build, part('fan-sl120'))).toEqual([]);
  });
});

describe('partConflicts với ổ cứng đã có trong build', () => {
  it('không báo vượt số ổ cho chính ổ đang lắp', () => {
    const build = resolveBuild({ ...VALID, drive: ['drv-hdd-2t', 'drv-ssd-1t'] });
    for (const d of build.drive!) expect(partConflicts(build, d)).toEqual([]);
  });
});
