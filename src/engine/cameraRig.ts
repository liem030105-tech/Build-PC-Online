import * as THREE from 'three';

/** Một mặt phẳng hướng về +Z (màn hình PC) mà camera cần zoom vào cho vừa khung. */
export interface CameraFocus {
  /** Tâm của mặt phẳng. */
  look: THREE.Vector3;
  width: number;
  height: number;
}

/** Phần chiều rộng/cao của khung nhìn mà mặt phẳng được chiếm khi zoom. */
const FOCUS_FILL = 0.76;
/** Đẩy mặt phẳng lên trên một chút để chừa chỗ cho thanh nút ở đáy màn hình. */
const FOCUS_RAISE = 0.06;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Camera góc nhìn thứ ba bay quanh nhân vật. Khi `focus` được đặt,
 * camera rời nhân vật và lướt tới một điểm cố định (zoom vào màn hình PC).
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  yaw = 0;
  pitch = 0.62;
  dist = 9;
  focus: CameraFocus | null = null;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private wantPos = new THREE.Vector3();
  private wantLook = new THREE.Vector3();
  private snapNext = true;

  /** Hướng "tiến lên" trên mặt đất theo góc camera hiện tại. */
  forward(): { x: number; z: number } {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  rotate(dx: number, dy: number, wheel: number) {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch + dy * 0.004, 0.25, 1.25);
    this.dist = clamp(this.dist + wheel * 0.008, 5, 14);
  }

  /** Bỏ qua chuyển động mượt ở khung hình kế tiếp (dùng khi đổi khu vực). */
  snap() {
    this.snapNext = true;
  }

  update(dt: number, target: THREE.Vector3) {
    let speed: number;
    if (this.focus) {
      // Lùi camera vừa đủ để mặt phẳng lọt khung theo cả chiều ngang lẫn chiều dọc,
      // nên cửa sổ dọc hay ngang đều thấy trọn màn hình.
      const f = this.focus;
      const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const dist =
        Math.max(f.height / 2 / halfTan, f.width / 2 / (halfTan * this.camera.aspect)) / FOCUS_FILL;
      const y = f.look.y - 2 * dist * halfTan * FOCUS_RAISE;
      this.wantLook.set(f.look.x, y, f.look.z);
      this.wantPos.set(f.look.x, y, f.look.z + dist);
      speed = 5;
    } else {
      this.wantLook.set(target.x, target.y + 1.2, target.z);
      const flat = Math.cos(this.pitch) * this.dist;
      this.wantPos.set(
        this.wantLook.x + Math.sin(this.yaw) * flat,
        this.wantLook.y + Math.sin(this.pitch) * this.dist,
        this.wantLook.z + Math.cos(this.yaw) * flat,
      );
      speed = 12;
    }

    const k = this.snapNext ? 1 : 1 - Math.exp(-dt * speed);
    this.snapNext = false;
    this.pos.lerp(this.wantPos, k);
    this.look.lerp(this.wantLook, k);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
