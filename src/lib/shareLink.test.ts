import { describe, expect, it } from 'vitest';
import { decodeBuild, encodeBuild, shareUrl } from './shareLink';

describe('link chia sẻ build', () => {
  it('mã hoá rồi giải mã ra đúng build', () => {
    const build = { cpu: 'cpu-7600', mainboard: 'mb-b650', gpu: 'gpu-4060', case: 'case-atx' };
    expect(decodeBuild(encodeBuild(build))).toEqual({ build, dropped: 0 });
  });

  it('giữ thứ tự loại linh kiện cố định', () => {
    expect(encodeBuild({ gpu: 'gpu-4060', cpu: 'cpu-7600' })).toBe('cpu=cpu-7600&gpu=gpu-4060');
  });

  it('build trống cho query rỗng', () => {
    expect(encodeBuild({})).toBe('');
    expect(decodeBuild('')).toEqual({ build: {}, dropped: 0 });
  });

  it('bỏ qua id không có trong danh mục hoặc sai loại', () => {
    expect(decodeBuild('?cpu=khong-co&gpu=cpu-7600&ram=ram-d4-16&foo=bar')).toEqual({
      build: { ram: 'ram-d4-16' },
      dropped: 2,
    });
  });

  it('tạo link tuyệt đối tới /share', () => {
    expect(shareUrl({ cpu: 'cpu-5600' }, 'https://vd.vn')).toBe('https://vd.vn/share?cpu=cpu-5600');
  });
});

describe('link chia sẻ: ổ cứng thêm, quạt, màn hình', () => {
  it('mã hoá ổ thêm bằng dấu phẩy và quạt kèm số lượng', () => {
    const build = { cpu: 'cpu-7600', drive: ['drv-hdd-1t', 'drv-hdd-1t'], fan: { id: 'fan-p12', qty: 3 }, monitor: 'mon-27-1440' };
    const query = encodeBuild(build);
    expect(query).toBe('cpu=cpu-7600&drive=drv-hdd-1t%2Cdrv-hdd-1t&fan=fan-p12*3&monitor=mon-27-1440');
    expect(decodeBuild(query)).toEqual({ build, dropped: 0 });
  });

  it('link kiểu cũ (chỉ 7 loại chính) vẫn mở được', () => {
    expect(decodeBuild('cpu=cpu-5600&ram=ram-d4-16')).toEqual({ build: { cpu: 'cpu-5600', ram: 'ram-d4-16' }, dropped: 0 });
  });

  it('chỉ giữ tối đa 2 ổ, bỏ ổ lạ, kẹp số quạt về 1–9', () => {
    expect(decodeBuild('drive=drv-hdd-1t,khong-co,drv-ssd-1t,drv-hdd-2t&fan=fan-p12*50')).toEqual({
      build: { drive: ['drv-hdd-1t', 'drv-ssd-1t'], fan: { id: 'fan-p12', qty: 9 } },
      dropped: 2,
    });
    expect(decodeBuild('fan=fan-p12').build.fan).toEqual({ id: 'fan-p12', qty: 1 });
  });
});
