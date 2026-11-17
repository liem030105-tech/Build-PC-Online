import { XanoClient, type Account } from '../net/xano';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((fn) => fn());

/** Phiên đăng nhập Xano của người chơi. */
export const session = {
  client: new XanoClient({
    apiUrl: import.meta.env.VITE_XANO_API_URL ?? '',
    authUrl: import.meta.env.VITE_XANO_AUTH_URL,
  }),
  account: null as Account | null,

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Khôi phục phiên từ token đã lưu. Token hết hạn thì coi như chưa đăng nhập. */
  async restore(): Promise<void> {
    if (!this.client.configured || !this.client.hasToken) return;
    try {
      this.account = await this.client.me();
    } catch {
      this.account = null;
    }
    notify();
  },

  async login(email: string, password: string): Promise<void> {
    this.account = await this.client.login(email, password);
    notify();
  },

  async signup(name: string, email: string, password: string): Promise<void> {
    this.account = await this.client.signup(name, email, password);
    notify();
  },

  logout() {
    this.client.logout();
    this.account = null;
    notify();
  },
};
