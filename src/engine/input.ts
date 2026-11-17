/** Bàn phím để đi lại, kéo chuột trên canvas để xoay camera. */
export class Input {
  private keys = new Set<string>();
  private dragging = false;
  private dx = 0;
  private dy = 0;
  private wheel = 0;

  /** Gọi một lần cho mỗi lần nhấn phím (không lặp khi giữ). */
  onKey: ((code: string) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      // Đang gõ vào ô nhập (email, tên build): phím chữ không phải lệnh của game.
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing && e.code !== 'Escape') return;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.onKey?.(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.dragging = false;
    });

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    const stop = () => (this.dragging = false);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', (e) => (this.wheel += e.deltaY), { passive: true });
  }

  /** Hướng đi: x dương là sang phải, y dương là tiến lên. */
  axis(): { x: number; y: number } {
    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    return { x, y };
  }

  /** Lấy lượng kéo chuột và cuộn tích lũy từ khung hình trước, rồi xóa. */
  consumePointer(): { dx: number; dy: number; wheel: number } {
    const out = { dx: this.dx, dy: this.dy, wheel: this.wheel };
    this.dx = this.dy = this.wheel = 0;
    return out;
  }
}
