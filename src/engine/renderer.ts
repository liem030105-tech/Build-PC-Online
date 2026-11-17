import * as THREE from 'three';

/** Số dòng pixel theo chiều dọc: càng nhỏ thì pixel càng to. */
export const DETAIL_WORLD = 300;
/**
 * Khi zoom vào màn hình PC thì vẽ ở độ phân giải đầy đủ: nội dung màn hình vốn đã là
 * ảnh pixel 320x180, vẽ thấp hơn nữa sẽ làm chữ không đọc được.
 */
export const DETAIL_MONITOR = Infinity;

/**
 * Renderer vẽ ở độ phân giải thấp rồi để CSS phóng to bằng
 * `image-rendering: pixelated`, tạo nét pixel cho cảnh 3D.
 */
export class PixelRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private detail = DETAIL_WORLD;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.resize();
  }

  setDetail(lines: number) {
    if (lines === this.detail) return;
    this.detail = lines;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.max(1, Math.round(h / this.detail));
    this.renderer.setSize(Math.ceil(w / scale), Math.ceil(h / scale), false);
  }
}
