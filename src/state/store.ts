import { CATEGORIES, PART_BY_ID, type BuildIds, type Category } from '../data/parts';

// Giữ key cũ để người dùng không mất cấu hình đang ráp; các trường cũ khác bị bỏ qua.
const KEY = 'buildpc-save-v1';

export interface BuildState {
  /** Linh kiện đang chọn cho từng loại. */
  build: BuildIds;
}

const empty = (): BuildState => ({ build: {} });

/** Chỉ giữ lại các khe trỏ tới linh kiện có thật và đúng loại. Trả về cả số khe bị bỏ. */
export function sanitize(ids: BuildIds | undefined): { build: BuildIds; dropped: number } {
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

function load(): BuildState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<BuildState>;
    return { build: sanitize(data.build).build };
  } catch {
    return empty();
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Mỗi lần đổi tạo object state mới, để React (useSyncExternalStore) nhận ra thay đổi. */
function commit(next: BuildState) {
  store.state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Không lưu được (chế độ riêng tư, hết dung lượng): vẫn dùng tiếp bình thường.
  }
  listeners.forEach((fn) => fn());
}

export const store = {
  state: empty(),

  /**
   * Đọc cấu hình đã lưu. Phải gọi SAU khi danh mục linh kiện đã sẵn sàng, vì
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

  /** Chọn một linh kiện cho loại tương ứng, hoặc bỏ chọn (id = null). */
  setSlot(category: Category, id: string | null) {
    if (id && PART_BY_ID.get(id)?.category !== category) return;
    const build = { ...this.state.build };
    if (id) build[category] = id;
    else delete build[category];
    commit({ build });
  },

  /**
   * Nạp một build (đã lưu hoặc từ link chia sẻ), thay hẳn cấu hình đang ráp.
   * Trả về số linh kiện bị bỏ qua vì không còn trong danh mục.
   */
  loadBuild(ids: BuildIds): number {
    const { build, dropped } = sanitize(ids);
    commit({ build });
    return dropped;
  },

  /** Bỏ hết linh kiện. */
  reset() {
    commit(empty());
  },
};
