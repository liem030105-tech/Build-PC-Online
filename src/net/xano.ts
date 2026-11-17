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

/** Bài đăng cộng đồng (bảng `post`). */
export interface Post {
  id: number;
  created_at: number;
  user_id: number;
  /** Tên tác giả lúc đăng bài. */
  author_name: string;
  title: string;
  description: string;
  /** Mã nhu cầu, xem src/data/purposes.ts. */
  purpose: string;
  parts: BuildIds;
  /** Tổng giá lúc đăng, VND. */
  total_price: number;
  like_count: number;
  comment_count: number;
}

export interface PostComment {
  id: number;
  created_at: number;
  post_id: number;
  user_id: number;
  author_name: string;
  content: string;
}

export interface PostDetail extends Post {
  comments: PostComment[];
}

export interface PostPage {
  items: Post[];
  curPage: number;
  /** Trang kế tiếp, null nếu đã hết. */
  nextPage: number | null;
  itemsTotal: number;
}

export type PostSort = 'new' | 'top';

export interface NewPost {
  title: string;
  description: string;
  purpose: string;
  parts: BuildIds;
  totalPrice: number;
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

  /** Một trang bài đăng cộng đồng (12 bài). Không cần đăng nhập. */
  async listPosts(opts: { page?: number; sort?: PostSort; purpose?: string | null } = {}): Promise<PostPage> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1), sort: opts.sort ?? 'new' });
    if (opts.purpose) params.set('purpose', opts.purpose);
    const res = await this.request<Partial<PostPage> | null>(this.apiUrl, 'GET', `/post?${params}`);
    return {
      items: (Array.isArray(res?.items) ? res.items : []).map(normalizePost),
      curPage: Number(res?.curPage) || 1,
      nextPage: res?.nextPage ? Number(res.nextPage) : null,
      itemsTotal: Number(res?.itemsTotal) || 0,
    };
  }

  /** Bài đăng kèm bình luận (cũ trước). Không cần đăng nhập. */
  async getPost(id: number): Promise<PostDetail> {
    const res = await this.request<{ post?: Post; comments?: PostComment[] } | null>(this.apiUrl, 'GET', `/post/${id}`);
    if (!res?.post) throw new XanoError('Không tìm thấy bài đăng.', 404);
    return {
      ...normalizePost(res.post),
      comments: (Array.isArray(res.comments) ? res.comments : []).map(normalizeComment),
    };
  }

  async createPost(input: NewPost): Promise<Post> {
    const row = await this.request<Post>(this.apiUrl, 'POST', '/post', {
      title: input.title,
      description: input.description,
      purpose: input.purpose,
      parts: input.parts,
      total_price: input.totalPrice,
    });
    return normalizePost(row);
  }

  async deletePost(id: number): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'DELETE', `/post/${id}`);
  }

  /** Bật/tắt thích. Trả về trạng thái mới và số lượt thích sau khi đổi. */
  async toggleLike(postId: number): Promise<{ liked: boolean; likeCount: number }> {
    const res = await this.request<{ liked?: unknown; like_count?: unknown }>(
      this.apiUrl,
      'POST',
      `/post/${postId}/like`,
      {},
    );
    return { liked: res?.liked === true, likeCount: Number(res?.like_count) || 0 };
  }

  /** Id các bài đăng mà người đang đăng nhập đã thích. */
  async likedPostIds(): Promise<number[]> {
    const rows = await this.request<{ post_id?: unknown }[]>(this.apiUrl, 'GET', '/post_like');
    return (Array.isArray(rows) ? rows : []).map((r) => Number(r.post_id)).filter((n) => n > 0);
  }

  async addComment(postId: number, content: string): Promise<PostComment> {
    const row = await this.request<PostComment>(this.apiUrl, 'POST', `/post/${postId}/comment`, { content });
    return normalizeComment(row);
  }

  async deleteComment(id: number): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'DELETE', `/comment/${id}`);
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
  // Thông báo do các endpoint bài đăng tự đặt (Xano lưu không dấu).
  'Tieu de can tu 3 den 120 ky tu.': 'Tiêu đề cần từ 3 đến 120 ký tự.',
  'Mo ta toi da 2000 ky tu.': 'Mô tả tối đa 2000 ký tự.',
  'Binh luan can tu 1 den 1000 ky tu.': 'Bình luận cần từ 1 đến 1000 ký tự.',
  'Khong tim thay bai dang.': 'Không tìm thấy bài đăng. Có thể bài đã bị xoá.',
  'Day khong phai bai dang cua ban.': 'Đây không phải bài đăng của bạn.',
  'Khong tim thay binh luan.': 'Không tìm thấy bình luận. Có thể đã bị xoá.',
  'Ban khong co quyen xoa binh luan nay.': 'Bạn không có quyền xoá bình luận này.',
};

function translate(status: number, message: string): string {
  if (MESSAGES[message]) return MESSAGES[message];
  if (status === 429) return 'Máy chủ đang quá tải, đợi vài giây rồi thử lại.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
  if (status === 400 && message) return `Thông tin nhập chưa hợp lệ: ${message}`;
  return message || `Máy chủ báo lỗi ${status}.`;
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown) => Number(v) || 0;

function normalizePost(row: Post): Post {
  return {
    id: num(row?.id),
    created_at: num(row?.created_at),
    user_id: num(row?.user_id),
    author_name: str(row?.author_name),
    title: str(row?.title),
    description: str(row?.description),
    purpose: str(row?.purpose) || 'other',
    parts: row?.parts && typeof row.parts === 'object' ? row.parts : {},
    total_price: num(row?.total_price),
    like_count: num(row?.like_count),
    comment_count: num(row?.comment_count),
  };
}

function normalizeComment(row: PostComment): PostComment {
  return {
    id: num(row?.id),
    created_at: num(row?.created_at),
    post_id: num(row?.post_id),
    user_id: num(row?.user_id),
    author_name: str(row?.author_name),
    content: str(row?.content),
  };
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
