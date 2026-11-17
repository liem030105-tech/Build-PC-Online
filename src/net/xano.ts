import type { BuildIds } from '../data/parts';

export interface Account {
  id: number;
  name: string;
  email: string;
}

/** Một build đã lưu trên Xano (bảng `build`). */
export interface SavedBuild {
  id: number;
  /** Thời điểm tạo, mili giây. */
  created_at: number;
  name: string;
  parts: BuildIds;
  total_price: number;
}

export class XanoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type TokenStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface XanoOptions {
  /** Base URL của nhóm API chứa các endpoint /build, dạng https://xxx.xano.io/api:abc. */
  apiUrl: string;
  /** Base URL của nhóm API đăng nhập, nếu khác nhóm trên. */
  authUrl?: string;
  fetch?: typeof fetch;
  storage?: TokenStore | null;
}

const TOKEN_KEY = 'buildpc-auth-token';
const trimUrl = (url: string | undefined) => (url ?? '').trim().replace(/\/+$/, '');

function defaultStorage(): TokenStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Gọi API Xano: đăng ký, đăng nhập, và lưu/đọc/xóa build của người đang đăng nhập. */
export class XanoClient {
  private apiUrl: string;
  private authUrl: string;
  private fetchFn: typeof fetch;
  private storage: TokenStore | null;
  private token: string | null;

  constructor(opts: XanoOptions) {
    this.apiUrl = trimUrl(opts.apiUrl);
    this.authUrl = trimUrl(opts.authUrl) || this.apiUrl;
    this.fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
    this.storage = opts.storage === undefined ? defaultStorage() : opts.storage;
    this.token = this.storage?.getItem(TOKEN_KEY) ?? null;
  }

  /** Đã khai báo API URL trong file .env chưa. */
  get configured(): boolean {
    return this.apiUrl !== '';
  }

  /** Đang giữ token đăng nhập (chưa chắc còn hạn). */
  get hasToken(): boolean {
    return this.token !== null;
  }

  async signup(name: string, email: string, password: string): Promise<Account> {
    const res = await this.request<{ authToken: string }>(this.authUrl, 'POST', '/auth/signup', {
      name,
      email,
      password,
    });
    this.setToken(res.authToken);
    return this.me();
  }

  async login(email: string, password: string): Promise<Account> {
    const res = await this.request<{ authToken: string }>(this.authUrl, 'POST', '/auth/login', {
      email,
      password,
    });
    this.setToken(res.authToken);
    return this.me();
  }

  async me(): Promise<Account> {
    const me = await this.request<Account>(this.authUrl, 'GET', '/auth/me');
    return { id: me.id, name: me.name, email: me.email };
  }

  logout() {
    this.setToken(null);
  }

  /** Các dòng thô của bảng `part` (danh mục linh kiện). Không cần đăng nhập. */
  async listParts(): Promise<unknown[]> {
    const rows = await this.request<unknown>(this.apiUrl, 'GET', '/part');
    if (!Array.isArray(rows)) throw new XanoError('Máy chủ trả về danh mục không đúng định dạng.', 0);
    return rows;
  }

  async listBuilds(): Promise<SavedBuild[]> {
    const rows = await this.request<SavedBuild[]>(this.apiUrl, 'GET', '/build');
    return (Array.isArray(rows) ? rows : []).map(normalizeBuild);
  }

  async saveBuild(name: string, parts: BuildIds, totalPrice: number): Promise<SavedBuild> {
    const row = await this.request<SavedBuild>(this.apiUrl, 'POST', '/build', {
      name,
      parts,
      total_price: totalPrice,
    });
    return normalizeBuild(row);
  }

  async deleteBuild(id: number): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'DELETE', `/build/${id}`);
  }

  private setToken(token: string | null) {
    this.token = token;
    try {
      if (token) this.storage?.setItem(TOKEN_KEY, token);
      else this.storage?.removeItem(TOKEN_KEY);
    } catch {
      // Không lưu được token thì chỉ mất đăng nhập khi tải lại trang.
    }
  }

  private async request<T>(base: string, method: string, path: string, body?: unknown): Promise<T> {
    if (!this.configured) throw new XanoError('Chưa cấu hình địa chỉ API Xano.', 0);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await this.fetchFn(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new XanoError('Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.', 0);
    }

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // Phản hồi rỗng (ví dụ khi xóa) là bình thường.
    }

    if (!res.ok) {
      // Token hết hạn hoặc sai: bỏ token để giao diện quay về màn hình đăng nhập.
      if (res.status === 401 && this.token && !path.startsWith('/auth/login')) this.setToken(null);
      const message = (data as { message?: unknown } | null)?.message;
      throw new XanoError(translate(res.status, typeof message === 'string' ? message : ''), res.status);
    }
    return data as T;
  }
}

/** Thông báo lỗi tiếng Anh mặc định của Xano, đổi sang tiếng Việt cho người dùng. */
const MESSAGES: Record<string, string> = {
  'Invalid Credentials.': 'Email hoặc mật khẩu không đúng.',
  'This account is already in use.': 'Email này đã được đăng ký. Hãy đăng nhập.',
};

function translate(status: number, message: string): string {
  if (MESSAGES[message]) return MESSAGES[message];
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
  if (status === 429) return 'Máy chủ đang quá tải, đợi vài giây rồi thử lại.';
  if (status === 400 && message) return `Thông tin nhập chưa hợp lệ: ${message}`;
  return message || `Máy chủ báo lỗi ${status}.`;
}

function normalizeBuild(row: SavedBuild): SavedBuild {
  return {
    id: row.id,
    created_at: Number(row.created_at) || 0,
    name: String(row.name ?? ''),
    parts: row.parts && typeof row.parts === 'object' ? row.parts : {},
    total_price: Number(row.total_price) || 0,
  };
}
