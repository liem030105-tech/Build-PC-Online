import type * as THREE from 'three';
import type { CameraFocus } from '../engine/cameraRig';
import type { Collider } from '../engine/collision';

/** Trò chơi chỉ có một khu vực: căn phòng của người chơi. */
export type AreaId = 'home';

export interface Spawn {
  x: number;
  z: number;
  /** Góc quay quanh trục Y của nhân vật. 0 là mặt hướng về +Z. */
  facing: number;
}

/** Vật mà người chơi đứng gần rồi bấm E để dùng. */
export interface Interactable {
  x: number;
  z: number;
  radius: number;
  label: () => string;
  action: () => void;
}

export interface Area {
  id: AreaId;
  title: string;
  group: THREE.Group;
  colliders: Collider[];
  bounds: Collider;
  interactables: Interactable[];
  spawns: Record<string, Spawn>;
  sky: number;
  /** Vị trí camera khi zoom vào màn hình PC. */
  monitorFocus?: CameraFocus;
  update?(camPos: THREE.Vector3, t: number): void;
}

/** Những việc mà thế giới yêu cầu phần điều khiển game thực hiện. */
export interface GameActions {
  useDesk(): void;
}
