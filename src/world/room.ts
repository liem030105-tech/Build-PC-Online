import * as THREE from 'three';
import type { Collider } from '../engine/collision';
import { box, mat } from './voxel';

type Side = 'back' | 'front' | 'left' | 'right';

export interface Room {
  bounds: Collider;
  /** Nhóm của từng bức tường: đồ gắn tường thêm vào đây để ẩn hiện cùng tường. */
  walls: Record<Side, THREE.Group>;
  /** Ẩn những bức tường đang chắn giữa camera và căn phòng. */
  update(camPos: THREE.Vector3): void;
}

const WALL_T = 0.3;

/**
 * Dựng một căn phòng hình chữ nhật tâm tại gốc tọa độ, kiểu nhà búp bê:
 * không có trần, và tường phía camera tự ẩn đi.
 * Tường sau ở -Z, tường trước (có cửa) ở +Z.
 */
export function buildRoom(
  group: THREE.Group,
  w: number,
  d: number,
  floor: THREE.Material,
  wallColor: number,
  height = 3,
): Room {
  box(group, [w, 0.2, d], [0, -0.2, 0], floor);

  const defs: Record<Side, { size: [number, number, number]; x: number; z: number; n: [number, number] }> = {
    back: { size: [w + WALL_T * 2, height, WALL_T], x: 0, z: -d / 2 - WALL_T / 2, n: [0, -1] },
    front: { size: [w + WALL_T * 2, height, WALL_T], x: 0, z: d / 2 + WALL_T / 2, n: [0, 1] },
    left: { size: [WALL_T, height, d], x: -w / 2 - WALL_T / 2, z: 0, n: [-1, 0] },
    right: { size: [WALL_T, height, d], x: w / 2 + WALL_T / 2, z: 0, n: [1, 0] },
  };

  const walls = {} as Record<Side, THREE.Group>;
  for (const side of Object.keys(defs) as Side[]) {
    const def = defs[side];
    const g = new THREE.Group();
    box(g, def.size, [def.x, 0, def.z], mat(wallColor));
    // Chân tường sẫm màu cho bớt trống.
    const skirt: [number, number, number] =
      def.n[0] === 0 ? [def.size[0], 0.25, WALL_T + 0.06] : [WALL_T + 0.06, 0.25, def.size[2]];
    box(g, skirt, [def.x, 0, def.z], 0x566c86);
    group.add(g);
    walls[side] = g;
  }

  return {
    bounds: { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 },
    walls,
    update(camPos) {
      for (const side of Object.keys(defs) as Side[]) {
        const def = defs[side];
        // Camera nằm phía ngoài bức tường (theo pháp tuyến hướng ra) thì ẩn tường đó.
        const outside = (camPos.x - def.x) * def.n[0] + (camPos.z - def.z) * def.n[1];
        walls[side].visible = outside < 0;
      }
    },
  };
}
