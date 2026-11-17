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
