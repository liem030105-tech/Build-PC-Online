import { describe, expect, it } from 'vitest';
import { colliderFromCenter, moveWithCollision } from './collision';

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

describe('moveWithCollision', () => {
  it('đi tự do khi không có vật cản', () => {
    const p = { x: 0, z: 0 };
    moveWithCollision(p, 1, 2, 0.5, [], bounds);
    expect(p).toEqual({ x: 1, z: 2 });
  });

  it('bị chặn bởi vật cản nhưng vẫn trượt theo trục còn lại', () => {
    const wall = colliderFromCenter(2, 0, 1, 10);
    const p = { x: 0.9, z: 0 };
    moveWithCollision(p, 0.5, 0.5, 0.5, [wall], bounds);
    expect(p).toEqual({ x: 0.9, z: 0.5 });
  });

  it('không ra khỏi biên khu vực', () => {
    const p = { x: 9, z: 0 };
    moveWithCollision(p, 5, 0, 0.5, [], bounds);
    expect(p.x).toBe(9.5);
  });
});
