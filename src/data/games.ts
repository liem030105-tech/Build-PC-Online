export type GameId = 'lol' | 'dota2' | 'cs2' | 'valorant';

export interface GameDef {
  id: GameId;
  name: string;
  /** Màu nền và màu nhấn dùng để vẽ màn hình PC. */
  color: string;
  accent: string;
  /** FPS ở 1080p khi CPU có gameScore = 100 và GPU không giới hạn. */
  cpuRefFps: number;
  /** FPS ở 1080p khi GPU có score = 100 và CPU không giới hạn. */
  gpuRefFps: number;
  /** Trần FPS của engine/thiết lập trong game. */
  engineCap: number;
  /** Tỉ lệ 1% low so với FPS trung bình. */
  lowRatio: number;
}

// Số liệu mô phỏng cho trò chơi, không phải benchmark thật.
export const GAMES: GameDef[] = [
  { id: 'lol', name: 'League of Legends', color: '#0b2a3a', accent: '#c8aa6e', cpuRefFps: 260, gpuRefFps: 420, engineCap: 1000, lowRatio: 0.65 },
  { id: 'dota2', name: 'Dota 2', color: '#2a0f0c', accent: '#e0452c', cpuRefFps: 170, gpuRefFps: 190, engineCap: 240, lowRatio: 0.7 },
  { id: 'cs2', name: 'Counter-Strike 2', color: '#1c2430', accent: '#f0a020', cpuRefFps: 230, gpuRefFps: 210, engineCap: 999, lowRatio: 0.6 },
  { id: 'valorant', name: 'Valorant', color: '#12202b', accent: '#ff4655', cpuRefFps: 300, gpuRefFps: 380, engineCap: 1000, lowRatio: 0.72 },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameDef>;
