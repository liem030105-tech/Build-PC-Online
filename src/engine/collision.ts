/** Hộp va chạm trên mặt phẳng XZ. */
export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function colliderFromCenter(x: number, z: number, w: number, d: number): Collider {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function hits(x: number, z: number, r: number, c: Collider): boolean {
  return x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Di chuyển một hình tròn bán kính r, xử lý riêng từng trục để nhân vật
 * trượt dọc theo tường thay vì đứng khựng lại.
 */
export function moveWithCollision(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  r: number,
  colliders: Collider[],
  bounds: Collider,
): void {
  const nx = clamp(pos.x + dx, bounds.minX + r, bounds.maxX - r);
  if (!colliders.some((c) => hits(nx, pos.z, r, c))) pos.x = nx;
  const nz = clamp(pos.z + dz, bounds.minZ + r, bounds.maxZ - r);
  if (!colliders.some((c) => hits(pos.x, nz, r, c))) pos.z = nz;
}
