import {
  MAX_DRIVES,
  MAX_FANS,
  PART_BY_ID,
  sanitizeIds,
  type BuildIds,
  type SingleCategory,
} from '../data/parts';

// Giữ key cũ để người dùng không mất cấu hình đang ráp; các trường cũ khác bị bỏ qua.
const KEY = 'buildpc-save-v1';

export interface BuildState {
  /** Linh kiện đang chọn cho từng loại. */
  build: BuildIds;
}

/** Chỉ giữ lại id có thật và đúng loại (xem sanitizeIds). */
export const sanitize = sanitizeIds;

const empty = (): BuildState => ({ build: {} });

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

  /** Lọc lại build theo danh mục hiện tại (sau khi trang quản trị đổi danh mục). */
  resanitize() {
    commit({ build: sanitize(this.state.build).build });
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Chọn một linh kiện cho loại tương ứng, hoặc bỏ chọn (id = null). */
  setSlot(category: SingleCategory, id: string | null) {
    if (id && PART_BY_ID.get(id)?.category !== category) return;
    const build = { ...this.state.build };
    if (id) build[category] = id;
    else delete build[category];
    commit({ build });
  },

  /** Thêm một ổ cứng thêm (tối đa MAX_DRIVES). */
  addDrive(id: string) {
    const drives = this.state.build.drive ?? [];
    if (drives.length >= MAX_DRIVES || PART_BY_ID.get(id)?.category !== 'drive') return;
    commit({ build: { ...this.state.build, drive: [...drives, id] } });
  },

  /** Bỏ ổ cứng thêm ở vị trí `index`. */
  removeDrive(index: number) {
    const drives = (this.state.build.drive ?? []).filter((_, i) => i !== index);
    const build: BuildIds = { ...this.state.build, drive: drives };
    if (!drives.length) delete build.drive;
    commit({ build });
  },

  /** Chọn mẫu quạt và số lượng, hoặc bỏ quạt (id = null). */
  setFan(id: string | null, qty?: number) {
    const build = { ...this.state.build };
    const n = qty ?? build.fan?.qty ?? 1;
    if (!id) delete build.fan;
    else if (PART_BY_ID.get(id)?.category === 'fan') {
      build.fan = { id, qty: Math.min(MAX_FANS, Math.max(1, Math.round(n))) };
    } else return;
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
