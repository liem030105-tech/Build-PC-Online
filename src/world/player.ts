import * as THREE from 'three';
import { moveWithCollision, type Collider } from '../engine/collision';
import { box, type Vec3 } from './voxel';

export interface CharacterColors {
  skin: number;
  shirt: number;
  pants: number;
  hair: number;
}

export interface CharacterRig {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

/** Nhân vật khối hộp cao khoảng 1.9 đơn vị, mặt hướng về +Z. */
export function buildCharacter(c: CharacterColors): CharacterRig {
  const group = new THREE.Group();

  // Tay chân gắn vào một điểm xoay ở vai/hông để vung khi đi.
  const limb = (x: number, pivotY: number, size: Vec3, color: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, 0);
    box(pivot, size, [0, -size[1], 0], color);
    group.add(pivot);
    return pivot;
  };

  const legL = limb(-0.16, 0.7, [0.26, 0.7, 0.26], c.pants);
  const legR = limb(0.16, 0.7, [0.26, 0.7, 0.26], c.pants);
  box(group, [0.6, 0.7, 0.34], [0, 0.7, 0], c.shirt);
  const armL = limb(-0.41, 1.38, [0.2, 0.66, 0.22], c.shirt);
  const armR = limb(0.41, 1.38, [0.2, 0.66, 0.22], c.shirt);

  box(group, [0.5, 0.5, 0.5], [0, 1.4, 0], c.skin);
  box(group, [0.54, 0.16, 0.54], [0, 1.82, 0], c.hair);
  box(group, [0.54, 0.36, 0.1], [0, 1.5, -0.25], c.hair);
  box(group, [0.08, 0.1, 0.02], [-0.12, 1.62, 0.25], 0x1a1c2c);
  box(group, [0.08, 0.1, 0.02], [0.12, 1.62, 0.25], 0x1a1c2c);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, armL, armR, legL, legR };
}

const SPEED = 5;

export class Player {
  readonly rig = buildCharacter({ skin: 0xf2c79b, shirt: 0x41a6f6, pants: 0x333c57, hair: 0x5a3a22 });
  readonly group = this.rig.group;
  readonly radius = 0.35;

  private walkT = 0;
  private swing = 0;
  private targetRot = Math.PI;

  place(x: number, z: number, facing: number) {
    this.group.position.set(x, 0, z);
    this.group.rotation.y = this.targetRot = facing;
    this.swing = 0;
  }

  /** `dirX`/`dirZ` là hướng đi trong không gian thế giới, đã chuẩn hóa hoặc bằng 0. */
  update(dt: number, dirX: number, dirZ: number, colliders: Collider[], bounds: Collider) {
    const moving = dirX !== 0 || dirZ !== 0;
    if (moving) {
      moveWithCollision(this.group.position, dirX * SPEED * dt, dirZ * SPEED * dt, this.radius, colliders, bounds);
      this.targetRot = Math.atan2(dirX, dirZ);
      this.walkT += dt * 10;
    }

    // Quay người theo đường ngắn nhất về hướng đang đi.
    let diff = this.targetRot - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * (1 - Math.exp(-dt * 14));

    const want = moving ? Math.sin(this.walkT) * 0.7 : 0;
    this.swing += (want - this.swing) * (1 - Math.exp(-dt * 18));
    this.rig.legL.rotation.x = this.swing;
    this.rig.legR.rotation.x = -this.swing;
    this.rig.armL.rotation.x = -this.swing;
    this.rig.armR.rotation.x = this.swing;
  }
}
