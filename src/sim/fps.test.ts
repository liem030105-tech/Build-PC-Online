import { describe, expect, it } from 'vitest';
import { GAMES, GAME_BY_ID } from '../data/games';
import { resolveBuild, type BuildIds } from '../data/parts';
import { RESOLUTION_FACTOR, buildResolution, estimateFps } from './fps';

const BUDGET: BuildIds = { cpu: 'cpu-12100f', ram: 'ram-d4-16', gpu: 'gpu-1650' };
const MID: BuildIds = { cpu: 'cpu-5600', ram: 'ram-d4-16', gpu: 'gpu-3060' };
const HIGH: BuildIds = { cpu: 'cpu-7800x3d', ram: 'ram-d5-32', gpu: 'gpu-4090' };

const fps = (ids: BuildIds, game = GAME_BY_ID.cs2) => estimateFps(resolveBuild(ids), game);

describe('estimateFps', () => {
  it('trả về đúng mức chuẩn cho máy chuẩn (R5 5600 + RTX 3060)', () => {
    // CS2: min(230 theo CPU, 210 theo GPU) = 210
    expect(fps(MID)).toEqual({ avg: 210, low1: 126 });
  });

  it('máy mạnh hơn cho FPS cao hơn ở mọi game', () => {
    for (const game of GAMES) {
      const b = fps(BUDGET, game)!;
      const m = fps(MID, game)!;
      const h = fps(HIGH, game)!;
      expect(m.avg).toBeGreaterThan(b.avg);
      expect(h.avg).toBeGreaterThanOrEqual(m.avg);
    }
  });

  it('không vượt trần FPS của game', () => {
    for (const game of GAMES) {
      expect(fps(HIGH, game)!.avg).toBeLessThanOrEqual(game.engineCap);
    }
    expect(fps(HIGH, GAME_BY_ID.dota2)!.avg).toBe(240);
  });

  it('1% low luôn thấp hơn FPS trung bình', () => {
    for (const game of GAMES) {
      const r = fps(MID, game)!;
      expect(r.low1).toBeLessThan(r.avg);
      expect(r.low1).toBeGreaterThan(0);
    }
  });

  it('RAM 8GB một thanh bị phạt so với 16GB hai thanh', () => {
    const full = fps(MID)!;
    const small = fps({ ...MID, ram: 'ram-d4-8' })!;
    expect(small.avg).toBe(Math.round(210 * 0.85 * 0.92));
    expect(small.avg).toBeLessThan(full.avg);
  });

  it('GPU yếu làm nghẽn dù CPU mạnh', () => {
    const r = fps({ cpu: 'cpu-7800x3d', ram: 'ram-d5-32', gpu: 'gpu-1650' })!;
    // CS2 theo GPU: 210 * 45 / 100 = 94.5
    expect(r.avg).toBe(95);
  });

  it('dùng iGPU khi không có card rời', () => {
    const r = fps({ cpu: 'cpu-7600', ram: 'ram-d5-16' }, GAME_BY_ID.lol)!;
    // LOL theo iGPU: 420 * 8 / 100 = 33.6
    expect(r.avg).toBe(34);
  });

  it('trả về null khi không có gì để xuất hình hoặc thiếu CPU/RAM', () => {
    expect(fps({ cpu: 'cpu-5600', ram: 'ram-d4-16' })).toBeNull();
    expect(fps({ ram: 'ram-d4-16', gpu: 'gpu-3060' })).toBeNull();
    expect(fps({ cpu: 'cpu-5600', gpu: 'gpu-3060' })).toBeNull();
  });
});

describe('FPS theo độ phân giải màn hình', () => {
  const GPU_BOUND = { cpu: 'cpu-7800x3d', ram: 'ram-d5-32', gpu: 'gpu-1650' };

  it('không chọn màn hình thì tính ở 1080p', () => {
    expect(buildResolution(resolveBuild(GPU_BOUND))).toBe('1080p');
  });

  it('màn 1440p và 4K làm giảm FPS khi card đồ họa là giới hạn', () => {
    const game = GAME_BY_ID.cs2;
    const p1080 = estimateFps(resolveBuild(GPU_BOUND), game)!.avg;
    const p1440 = estimateFps(resolveBuild({ ...GPU_BOUND, monitor: 'mon-27-1440' }), game)!.avg;
    const p4k = estimateFps(resolveBuild({ ...GPU_BOUND, monitor: 'mon-27-4k' }), game)!.avg;
    expect(Math.abs(p1440 - p1080 * RESOLUTION_FACTOR['1440p'])).toBeLessThanOrEqual(1);
    expect(p4k).toBeLessThan(p1440);
  });

  it('màn 1080p tần số cao không đổi FPS', () => {
    const game = GAME_BY_ID.valorant;
    expect(estimateFps(resolveBuild({ ...GPU_BOUND, monitor: 'mon-24-180' }), game)).toEqual(
      estimateFps(resolveBuild(GPU_BOUND), game),
    );
  });
});
