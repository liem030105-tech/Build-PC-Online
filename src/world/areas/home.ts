import * as THREE from 'three';
import { colliderFromCenter, type Collider } from '../../engine/collision';
import { store } from '../../state/store';
import type { MonitorScreen } from '../../ui/monitorScreen';
import { buildRoom } from '../room';
import type { Area, GameActions } from '../types';
import { box, glow, makeLabel, pixelTexture, textured } from '../voxel';

const W = 12;
const D = 10;

const DESK_X = 2.6;
const DESK_Z = -4.3;
const DESK_TOP = 0.85;
const MON_X = DESK_X - 0.35;
const MON_Z = DESK_Z - 0.3;
const SCREEN_Y = DESK_TOP + 0.78;

export function buildHome(actions: GameActions, monitor: MonitorScreen): Area {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const solid = (x: number, z: number, w: number, d: number) => colliders.push(colliderFromCenter(x, z, w, d));

  const planks = pixelTexture(0xb98a5e, {
    noise: 0.06,
    repeat: [W / 2, D / 2],
    paint: (ctx, s) => {
      ctx.fillStyle = '#8f6742';
      ctx.fillRect(0, 0, s, 1);
      ctx.fillRect(0, s / 2, s, 1);
      ctx.fillRect(4, 0, 1, s / 2);
      ctx.fillRect(11, s / 2, 1, s / 2);
    },
  });
  const room = buildRoom(group, W, D, textured(planks), 0xe8d8b8);

  // Thảm
  box(group, [4.2, 0.03, 3], [-0.6, 0, 0.6], 0xb13e53);
  box(group, [3.6, 0.04, 2.4], [-0.6, 0, 0.6], 0xef7d57);

  // Giường
  box(group, [2.4, 0.45, 4.2], [-4.6, 0, -2.7], 0x6b4226);
  box(group, [2.2, 0.25, 4], [-4.6, 0.45, -2.7], 0xf4f4f4);
  box(group, [2.24, 0.28, 2.6], [-4.6, 0.45, -2], 0x3b5dc9);
  box(group, [1.5, 0.2, 0.8], [-4.6, 0.7, -4.2], 0xf4f4f4);
  box(group, [2.4, 1.1, 0.2], [-4.6, 0, -4.85], 0x6b4226);
  solid(-4.6, -2.75, 2.4, 4.4);

  // Giá sách
  box(group, [0.6, 2.4, 2.2], [5.6, 0, -0.6], 0x6b4226);
  for (let row = 0; row < 3; row++) {
    const colors = [0xb13e53, 0x38b764, 0x41a6f6, 0xffcd75, 0x5d275d];
    for (let k = 0; k < 5; k++) {
      box(group, [0.1, 0.5, 0.3], [5.28, 0.3 + row * 0.75, -1.4 + k * 0.4], colors[(k + row) % 5]);
    }
  }
  solid(5.6, -0.6, 0.6, 2.2);

  // Chậu cây
  box(group, [0.6, 0.5, 0.6], [5.3, 0, 3.9], 0xef7d57);
  box(group, [0.9, 0.7, 0.9], [5.3, 0.5, 3.9], 0x38b764);
  box(group, [0.5, 0.5, 0.5], [5.3, 1.2, 3.9], 0xa7f070);
  solid(5.3, 3.9, 0.7, 0.7);

  // Cửa sổ và tranh gắn trên tường sau, ẩn hiện cùng tường.
  box(room.walls.back, [2.4, 1.6, 0.06], [-1.6, 1.2, -D / 2 + 0.01], 0xf4f4f4);
  box(room.walls.back, [2.1, 1.3, 0.06], [-1.6, 1.35, -D / 2 + 0.04], 0x73eff7);
  box(room.walls.back, [0.08, 1.3, 0.06], [-1.6, 1.35, -D / 2 + 0.07], 0xf4f4f4);

  // Bàn máy tính
  box(group, [3, 0.1, 1.2], [DESK_X, DESK_TOP - 0.1, DESK_Z], 0x8b5a2b);
  for (const [dx, dz] of [[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]]) {
    box(group, [0.12, DESK_TOP - 0.1, 0.12], [DESK_X + dx, 0, DESK_Z + dz], 0x6b4226);
  }
  solid(DESK_X, DESK_Z, 3, 1.2);

  // Màn hình
  box(group, [0.6, 0.05, 0.3], [MON_X, DESK_TOP, MON_Z], 0x333c57);
  box(group, [0.16, 0.28, 0.12], [MON_X, DESK_TOP, MON_Z], 0x333c57);
  box(group, [1.72, 1.02, 0.08], [MON_X, SCREEN_Y - 0.51, MON_Z], 0x1a1c2c);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.9),
    new THREE.MeshBasicMaterial({ map: monitor.texture }),
  );
  screen.position.set(MON_X, SCREEN_Y, MON_Z + 0.045);
  group.add(screen);

  // Bàn phím, chuột, ghế
  box(group, [0.9, 0.04, 0.3], [MON_X, DESK_TOP, DESK_Z + 0.3], 0x333c57);
  box(group, [0.14, 0.05, 0.2], [MON_X + 0.75, DESK_TOP, DESK_Z + 0.3], 0xf4f4f4);
  box(group, [0.7, 0.1, 0.7], [MON_X - 1.6, 0.5, DESK_Z + 1.3], 0x5d275d);
  box(group, [0.7, 0.9, 0.1], [MON_X - 1.6, 0.6, DESK_Z + 1.6], 0x5d275d);
  box(group, [0.12, 0.5, 0.12], [MON_X - 1.6, 0, DESK_Z + 1.3], 0x333c57);

  // Thùng PC: chỉ xuất hiện sau khi ráp xong và khởi động.
  const pc = new THREE.Group();
  pc.position.set(DESK_X + 1.05, DESK_TOP, DESK_Z - 0.05);
  box(pc, [0.44, 0.9, 0.9], [0, 0, 0], 0x1a1c2c);
  box(pc, [0.02, 0.7, 0.7], [-0.23, 0.1, 0], 0x566c86);
  const fans = [0xef7d57, 0xa7f070, 0x41a6f6].map((color, i) =>
    box(pc, [0.28, 0.2, 0.02], [0, 0.1 + i * 0.27, 0.46], glow(color)),
  );
  const strip = box(pc, [0.02, 0.6, 0.06], [-0.245, 0.15, 0.3], glow(0x73eff7));
  group.add(pc);
  const note = makeLabel('Chưa có PC', 0.4, { fg: '#f4f4f4', bg: '#b13e53' });
  note.position.set(DESK_X + 1.05, DESK_TOP + 0.5, DESK_Z);
  group.add(note);

  const sync = () => {
    pc.visible = store.state.pcBuilt;
    note.visible = !store.state.pcBuilt;
  };
  sync();
  store.subscribe(sync);

  // Cửa phòng luôn đóng: nhân vật chỉ ở trong phòng. Gắn vào tường trước để ẩn hiện cùng tường.
  box(room.walls.front, [1.5, 2.3, 0.08], [0, 0, D / 2 - 0.03], 0x6b4226);
  box(room.walls.front, [1.2, 0.9, 0.06], [0, 1.2, D / 2 - 0.08], 0x8b5a2b);
  box(room.walls.front, [0.12, 0.12, 0.1], [0.5, 1, D / 2 - 0.1], 0xffcd75);

  return {
    id: 'home',
    title: 'Phòng của bạn',
    group,
    colliders,
    bounds: room.bounds,
    interactables: [
      {
        x: MON_X,
        z: DESK_Z + 1.1,
        radius: 1.7,
        label: () => (store.state.pcBuilt ? 'Dùng máy tính' : 'Ráp PC'),
        action: () => actions.useDesk(),
      },
    ],
    spawns: { start: { x: 0, z: 0.8, facing: Math.PI } },
    sky: 0x1a1c2c,
    monitorFocus: { look: screen.position.clone(), width: 1.6, height: 0.9 },
    update(camPos, t) {
      room.update(camPos);
      if (pc.visible) {
        fans.forEach((fan, i) => (fan.visible = Math.floor(t * 4 + i) % 3 !== 0));
        strip.visible = Math.floor(t * 2) % 2 === 0;
      }
    },
  };
}
