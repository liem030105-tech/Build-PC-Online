import * as THREE from 'three';
import type { GameDef } from '../data/games';
import type { FpsEstimate } from '../sim/fps';
import { FONT } from '../world/voxel';

const W = 320;
const H = 180;

type Mode = 'off' | 'desktop' | 'game';

/** Nội dung màn hình PC trong thế giới game, vẽ lên canvas rồi dùng làm texture. */
export class MonitorScreen {
  readonly canvas = document.createElement('canvas');
  readonly texture: THREE.CanvasTexture;

  private ctx: CanvasRenderingContext2D;
  private mode: Mode = 'off';
  private game: GameDef | null = null;
  private fps: FpsEstimate | null = null;
  private shownFps = 0;
  private nextTick = 0;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  setOff() {
    this.mode = 'off';
  }

  setDesktop() {
    this.mode = 'desktop';
  }

  setGame(game: GameDef, fps: FpsEstimate) {
    this.mode = 'game';
    this.game = game;
    this.fps = fps;
    this.nextTick = 0;
  }

  draw(t: number) {
    const ctx = this.ctx;
    if (this.mode === 'off') {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, W, H);
    } else if (this.mode === 'desktop') {
      this.drawDesktop(t);
    } else if (this.game && this.fps) {
      this.drawGame(t, this.game, this.fps);
    }
    this.texture.needsUpdate = true;
  }

  private text(s: string, x: number, y: number, px: number, color: string, align: CanvasTextAlign = 'left') {
    const ctx = this.ctx;
    ctx.font = `${px}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  private drawDesktop(t: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#29366f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3b5dc9';
    ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, H - 16, W, 16);
    ctx.fillStyle = '#41a6f6';
    ctx.fillRect(4, H - 13, 10, 10);
    this.text('PC ĐÃ SẴN SÀNG', W / 2, 78, 32, '#f4f4f4', 'center');
    if (Math.floor(t * 2) % 2 === 0) {
      this.text('Chọn game để chạy thử', W / 2, 112, 16, '#ffcd75', 'center');
    }
  }

  private drawGame(t: number, game: GameDef, fps: FpsEstimate) {
    const ctx = this.ctx;

    // Hoạt ảnh nền chỉ cập nhật theo nhịp FPS ước tính: máy yếu thì hình giật thấy rõ.
    const tq = fps.avg >= 60 ? t : Math.floor(t * fps.avg) / fps.avg;

    ctx.fillStyle = game.color;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = game.accent;
    for (let i = 0; i < 26; i++) {
      const speed = 30 + ((i * 37) % 70);
      const size = 2 + (i % 3) * 2;
      const x = (((i * 97) % W) - tq * speed) % W;
      const y = 44 + ((i * 53) % (H - 80));
      ctx.globalAlpha = 0.25 + (i % 4) * 0.15;
      ctx.fillRect(Math.round(x < 0 ? x + W : x), y, size, size);
    }
    ctx.globalAlpha = 1;
    const bob = Math.round(Math.sin(tq * 4) * 14);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(W / 2 - 7, 122 + bob, 14, 14);
    ctx.fillStyle = game.accent;
    ctx.fillRect(W / 2 - 4, 125 + bob, 8, 8);

    this.text(game.name, W / 2, 88, 32, '#f4f4f4', 'center');

    // Bộ đếm FPS dao động nhẹ quanh mức trung bình, đổi số 4 lần mỗi giây.
    if (t >= this.nextTick) {
      this.nextTick = t + 0.25;
      this.shownFps = Math.max(1, Math.round(fps.avg * (1 + (Math.random() - 0.5) * 0.06)));
    }
    const color = this.shownFps >= 144 ? '#a7f070' : this.shownFps >= 60 ? '#ffcd75' : '#ef7d57';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 4, 124, 40);
    this.text(String(this.shownFps), 10, 23, 48, color);
    this.text('FPS', 122, 28, 16, color, 'right');

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, H - 20, W, 20);
    this.text(`TB ${fps.avg} · 1% thấp ${fps.low1} · 1080p`, 6, H - 10, 16, '#f4f4f4');
    this.text('FPS ước tính', W - 6, H - 10, 16, '#94b0c2', 'right');
  }
}
