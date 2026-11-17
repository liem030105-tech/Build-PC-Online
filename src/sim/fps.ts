import type { Build } from '../data/parts';
import type { GameDef } from '../data/games';

export interface FpsEstimate {
  avg: number;
  low1: number;
}

const REF_SCORE = 100;

/** Hệ số phạt khi RAM ít hoặc chạy một thanh (single channel). */
export function ramFactor(totalGB: number, sticks: number): number {
  let f = 1;
  if (totalGB < 16) f *= 0.85;
  if (sticks < 2) f *= 0.92;
  return f;
}

/** FPS ước tính ở 1080p. Trả về null nếu cấu hình chưa đủ để chạy. */
export function estimateFps(build: Build, game: GameDef): FpsEstimate | null {
  const { cpu, ram, gpu } = build;
  if (!cpu || !ram) return null;
  const gpuScore = gpu ? gpu.score : cpu.hasIGPU ? cpu.igpuScore : 0;
  if (gpuScore <= 0) return null;

  const cpuFps = (game.cpuRefFps * cpu.gameScore) / REF_SCORE;
  const gpuFps = (game.gpuRefFps * gpuScore) / REF_SCORE;
  const raw = Math.min(cpuFps, gpuFps) * ramFactor(ram.totalGB, ram.sticks);
  const avg = Math.max(1, Math.round(Math.min(raw, game.engineCap)));
  const low1 = Math.max(1, Math.round(avg * game.lowRatio));
  return { avg, low1 };
}
