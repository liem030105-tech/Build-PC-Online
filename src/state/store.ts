import type { GameId } from '../data/games';
import { CATEGORIES, PART_BY_ID, type BuildIds, type Category } from '../data/parts';

const KEY = 'buildpc-save-v1';

export interface GameState {
  /** Linh kiện đang lắp vào từng khe, chọn thẳng từ danh mục. */
  build: BuildIds;
  /** PC đã được khởi động thành công với cấu hình hiện tại. */
  pcBuilt: boolean;
  game: GameId | null;
}

const empty = (): GameState => ({ build: {}, pcBuilt: false, game: null });

/** Chỉ giữ lại các khe trỏ tới linh kiện có thật và đúng loại. Trả về cả số khe bị bỏ. */
function sanitize(ids: BuildIds | undefined): { build: BuildIds; dropped: number } {
  const build: BuildIds = {};
  let dropped = 0;
  for (const c of CATEGORIES) {
    const id = ids?.[c.id];
    if (!id) continue;
    if (typeof id === 'string' && PART_BY_ID.get(id)?.category === c.id) build[c.id] = id;
    else dropped++;
  }
  return { build, dropped };
}

function load(): GameState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<GameState>;
    const { build, dropped } = sanitize(data.build);
    // Linh kiện đang lắp bị gỡ khỏi danh mục thì máy không còn nguyên vẹn: phải ráp lại.
    const pcBuilt = !!data.pcBuilt && dropped === 0;
    return { build, pcBuilt, game: pcBuilt ? (data.game ?? null) : null };
  } catch {
    return empty();
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch {
    // Không lưu được (chế độ riêng tư, hết dung lượng): vẫn chơi tiếp bình thường.
  }
  listeners.forEach((fn) => fn());
}

export const store = {
  state: empty(),

  /**
   * Đọc tiến trình đã lưu. Phải gọi SAU khi danh mục linh kiện đã sẵn sàng, vì
   * khe nào trỏ tới linh kiện không có trong danh mục sẽ bị bỏ trống.
   */
  hydrate() {
    this.state = load();
    listeners.forEach((fn) => fn());
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Lắp một linh kiện vào khe, hoặc tháo ra (id = null). Đổi linh kiện thì phải khởi động lại. */
  setSlot(category: Category, id: string | null) {
    if (id && PART_BY_ID.get(id)?.category !== category) return;
    if (id) this.state.build[category] = id;
    else delete this.state.build[category];
    this.state.pcBuilt = false;
    this.state.game = null;
    commit();
  },

  /**
   * Nạp một build đã lưu vào các khe, thay hẳn cấu hình đang ráp.
   * Trả về số linh kiện bị bỏ qua vì không còn trong danh mục.
   */
  loadBuild(ids: BuildIds): number {
    const { build, dropped } = sanitize(ids);
    this.state = { build, pcBuilt: false, game: null };
    commit();
    return dropped;
  },

  markBuilt() {
    this.state.pcBuilt = true;
    commit();
  },

  setGame(id: GameId | null) {
    this.state.game = id;
    commit();
  },

  /** Tháo hết linh kiện, quay về bàn trống. */
  reset() {
    this.state = empty();
    commit();
  },
};
