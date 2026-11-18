import { session } from './session';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((fn) => fn());

/**
 * Các bài đăng mà người đang đăng nhập đã thích. Dùng chung cho trang Cộng đồng và
 * trang chi tiết, để thích ở một nơi thì nơi kia cũng thấy.
 */
export const likes = {
  /** Đổi object mỗi lần cập nhật, để useSyncExternalStore nhận ra. */
  ids: new Set<number>() as ReadonlySet<number>,
  /** Id tài khoản đã tải danh sách; null nếu chưa tải. */
  loadedFor: null as number | null,

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Tải danh sách đã thích của tài khoản hiện tại (một lần mỗi tài khoản). */
  async ensureLoaded(): Promise<void> {
    const account = session.account;
    if (!account) {
      if (this.loadedFor !== null) {
        this.loadedFor = null;
        this.ids = new Set();
        notify();
      }
      return;
    }
    if (this.loadedFor === account.id) return;
    this.loadedFor = account.id;
    try {
      this.ids = new Set(await session.client.likedPostIds());
    } catch {
      // Không tải được thì nút thích hiện trạng thái chưa thích; bấm vẫn chạy đúng.
      this.loadedFor = null;
    }
    notify();
  },

  set(postId: number, liked: boolean) {
    const next = new Set(this.ids);
    if (liked) next.add(postId);
    else next.delete(postId);
    this.ids = next;
    notify();
  },
};
