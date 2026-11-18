import { describe, expect, it } from 'vitest';
import { fitSize, rejectReason } from './image';

describe('thu nhỏ ảnh trước khi tải', () => {
  it('giữ tỉ lệ, cạnh dài tối đa 1600px', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(1080, 1920)).toEqual({ width: 900, height: 1600 });
  });

  it('ảnh nhỏ giữ nguyên kích thước', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('từ chối file không phải ảnh hoặc lớn hơn 10 MB', () => {
    expect(rejectReason({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toContain('không phải ảnh');
    expect(rejectReason({ name: 'a.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 })).toContain('10 MB');
    expect(rejectReason({ name: 'a.png', type: 'image/png', size: 2_000_000 })).toBeNull();
  });
});
