import * as THREE from 'three';

export type Vec3 = [number, number, number];

const matCache = new Map<number, THREE.MeshLambertMaterial>();
const geoCache = new Map<string, THREE.BoxGeometry>();

/** Vật liệu màu trơn, dùng chung theo mã màu. */
export function mat(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
}

/** Vật liệu tự phát sáng, không chịu ảnh hưởng của đèn (màn hình, đèn LED). */
export function glow(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/**
 * Thêm một khối hộp vào `parent`. `pos` là tâm theo X/Z và ĐÁY theo Y,
 * nên đặt đồ vật lên sàn chỉ cần y = 0.
 */
export function box(
  parent: THREE.Object3D,
  size: Vec3,
  pos: Vec3,
  material: THREE.Material | number,
): THREE.Mesh {
  const key = size.join('x');
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    geoCache.set(key, geo);
  }
  const mesh = new THREE.Mesh(geo, typeof material === 'number' ? mat(material) : material);
  mesh.position.set(pos[0], pos[1] + size[1] / 2, pos[2]);
  parent.add(mesh);
  return mesh;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PixelTextureOptions {
  /** Độ lệch sáng tối ngẫu nhiên giữa các pixel, 0 đến 1. */
  noise?: number;
  size?: number;
  seed?: number;
  repeat?: [number, number];
  /** Vẽ thêm họa tiết (đường kẻ, viền gạch) lên trên lớp nhiễu. */
  paint?: (ctx: CanvasRenderingContext2D, size: number) => void;
}

/** Texture pixel nhỏ sinh bằng code, lặp lại được. */
export function pixelTexture(base: number, opts: PixelTextureOptions = {}): THREE.CanvasTexture {
  const size = opts.size ?? 16;
  const noise = opts.noise ?? 0.06;
  const rand = mulberry32(opts.seed ?? base);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const r = (base >> 16) & 255;
  const g = (base >> 8) & 255;
  const b = base & 255;
  const ch = (v: number, k: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = 1 + (rand() - 0.5) * 2 * noise;
      ctx.fillStyle = `rgb(${ch(r, k)},${ch(g, k)},${ch(b, k)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  opts.paint?.(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  return tex;
}

export function textured(tex: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: tex });
}

export const FONT = "'VT323', 'Courier New', monospace";

export interface TextOptions {
  fg?: string;
  bg?: string;
  /** Cỡ chữ trên canvas, tính bằng pixel. */
  px?: number;
  border?: string;
}

function textCanvas(text: string, opts: TextOptions): HTMLCanvasElement {
  const px = opts.px ?? 32;
  const pad = Math.round(px * 0.35);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${px}px ${FONT}`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = Math.round(px * 1.25);
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = opts.bg ?? '#1a1c2c';
  ctx.fillRect(0, 0, w, h);
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }
  ctx.font = `${px}px ${FONT}`;
  ctx.fillStyle = opts.fg ?? '#f4f4f4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
  return canvas;
}

function textTexture(text: string, opts: TextOptions): { tex: THREE.CanvasTexture; aspect: number } {
  const canvas = textCanvas(text, opts);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: canvas.width / canvas.height };
}

/** Biển chữ phẳng, mặt hướng về +Z. `height` tính theo đơn vị thế giới. */
export function makeSign(text: string, height: number, opts: TextOptions = {}): THREE.Mesh {
  const { tex, aspect } = textTexture(text, opts);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
}

/** Nhãn chữ luôn quay mặt về phía camera. */
export function makeLabel(text: string, height: number, opts: TextOptions = {}): THREE.Sprite {
  const { tex, aspect } = textTexture(text, opts);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  sprite.scale.set(height * aspect, height, 1);
  return sprite;
}
