import type { PartRow } from '../data/catalog';
import type { BuildIds } from '../data/parts';

export interface Account {
  id: number;
  name: string;
  email: string;
  /** "admin" được sửa danh mục linh kiện; còn lại là "user". */
  role: string;
}

/** Một build đã lưu trên Xano (bảng `build`). */
export interface SavedBuild {
  id: number;
  /** Thời điểm tạo, mili giây. */
  created_at: number;
  name: string;
  parts: BuildIds;
  total_price: number;
  verify_status: VerifyStatus;
  /** Lý do admin từ chối (khi verify_status = rejected). */
  verify_reason: string;
  /** Video đã được duyệt (khi verify_status = approved). */
  verified_videos: VideoLink[];
}

/** none: chưa gửi; pending: chờ admin duyệt; approved: đã xác minh; rejected: bị từ chối. */
export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Link video quay một game chạy trên máy, gửi kèm yêu cầu xác minh. */
export interface VideoLink {
  game: string;
  url: string;
}

/** Một yêu cầu xác minh (bảng `verification`), admin xem và duyệt. */
export interface Verification {
  id: number;
  created_at: number;
  build_id: number;
  user_id: number;
  author_name: string;
  build_name: string;
  /** Bản chép build lúc gửi yêu cầu. */
  parts: BuildIds;
  videos: VideoLink[];
  note: string;
  status: Exclude<VerifyStatus, 'none'>;
  reject_reason: string;
  reviewed_at: number;
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
  /** Đường dẫn ảnh trên Xano (/vault/...), ảnh đầu là ảnh bìa. Dùng mediaUrl() để ra link đầy đủ. */
  images: string[];
  /** Build đã lưu mà bài được đăng từ đó (0 nếu đăng thẳng từ trang Build PC). */
  build_id: number;
  /** Build gốc đã được admin xác minh. */
  verified: boolean;
  /** Video thực tế của build đã xác minh. */
  videos: VideoLink[];
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
  /** Đường dẫn ảnh đã tải lên bằng uploadImage(), tối đa 4. */
  images?: string[];
  /** Đăng từ build đã lưu: máy chủ lấy linh kiện của build đó và chép trạng thái xác minh. */
  buildId?: number;
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
    return { id: me.id, name: me.name, email: me.email, role: me.role === 'admin' ? 'admin' : 'user' };
  }

  /** Thêm linh kiện vào danh mục (chỉ admin). Trả về dòng thô vừa tạo. */
  async createPart(row: PartRow): Promise<Record<string, unknown>> {
    return this.request(this.apiUrl, 'POST', '/part', row);
  }

  /** Sửa linh kiện có id `id` trong bảng `part` (chỉ admin). Gửi đủ mọi cột; cột không có thì bị xoá. */
  async updatePart(id: number, row: PartRow): Promise<Record<string, unknown>> {
    return this.request(this.apiUrl, 'PATCH', `/part/${id}`, row);
  }

  async deletePart(id: number): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'DELETE', `/part/${id}`);
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
  async listPosts(
    opts: { page?: number; sort?: PostSort; purpose?: string | null; verified?: boolean } = {},
  ): Promise<PostPage> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1), sort: opts.sort ?? 'new' });
    if (opts.purpose) params.set('purpose', opts.purpose);
    if (opts.verified) params.set('verified', 'true');
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
      images: input.images ?? [],
      ...(input.buildId ? { build_id: input.buildId } : {}),
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

  /** Gửi yêu cầu xác minh cho build đã lưu, kèm 1–4 video chơi game trên máy đó. */
  async requestVerification(buildId: number, videos: VideoLink[], note: string): Promise<Verification> {
    const row = await this.request<Verification>(this.apiUrl, 'POST', `/build/${buildId}/verify`, { videos, note });
    return normalizeVerification(row);
  }

  /** Các yêu cầu xác minh theo trạng thái, mới nhất trước (chỉ admin). */
  async listVerifications(status: Exclude<VerifyStatus, 'none'> = 'pending'): Promise<Verification[]> {
    const rows = await this.request<Verification[]>(this.apiUrl, 'GET', `/verification?status=${status}`);
    return (Array.isArray(rows) ? rows : []).map(normalizeVerification);
  }

  async approveVerification(id: number): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'POST', `/verification/${id}/approve`, {});
  }

  async rejectVerification(id: number, reason: string): Promise<void> {
    await this.request<unknown>(this.apiUrl, 'POST', `/verification/${id}/reject`, { reason });
  }

  /** Tải một ảnh lên kho của Xano. Trả về đường dẫn `/vault/...` để gắn vào bài đăng. */
  async uploadImage(image: Blob, filename = 'anh.jpg'): Promise<string> {
    const form = new FormData();
    form.append('image', image, filename);
    const res = await this.request<{ path?: unknown }>(this.apiUrl, 'POST', '/upload/image', form);
    if (typeof res?.path !== 'string' || !res.path.startsWith('/')) {
      throw new XanoError('Máy chủ không trả về đường dẫn ảnh.', 0);
    }
    return res.path;
  }

  /** Link đầy đủ tới một ảnh trong kho Xano (cùng máy chủ với API). */
  mediaUrl(path: string): string {
    try {
      return new URL(path, new URL(this.apiUrl).origin).toString();
    } catch {
      return path;
    }
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
    const form = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await this.fetchFn(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
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
  'Chi admin moi duoc sua danh muc linh kien.': 'Chỉ admin mới được sửa danh mục linh kiện.',
  'Ma linh kien da ton tai.': 'Mã linh kiện đã tồn tại, hãy chọn mã khác.',
  'Khong tim thay linh kien.': 'Không tìm thấy linh kiện. Có thể đã bị xoá.',
  'Toi da 4 anh moi bai dang.': 'Mỗi bài đăng tối đa 4 ảnh.',
  'Anh khong hop le.': 'Ảnh không hợp lệ, hãy tải lại ảnh.',
  'Khong tim thay build.': 'Không tìm thấy build. Có thể đã bị xoá.',
  'Day khong phai build cua ban.': 'Đây không phải build của bạn.',
  'Build khong hop le.': 'Build không hợp lệ.',
  'Build nay dang cho duyet hoac da duoc xac minh.': 'Build này đang chờ duyệt hoặc đã được xác minh.',
  'Can tu 1 den 4 video.': 'Cần từ 1 đến 4 video.',
  'Link video hoac ten game khong hop le.': 'Link video hoặc tên game không hợp lệ.',
  'Ghi chu toi da 500 ky tu.': 'Ghi chú tối đa 500 ký tự.',
  'Chi admin moi duoc duyet xac minh.': 'Chỉ admin mới được duyệt xác minh.',
  'Khong tim thay yeu cau xac minh.': 'Không tìm thấy yêu cầu xác minh.',
  'Yeu cau nay da duoc xu ly.': 'Yêu cầu này đã được xử lý.',
  'Ly do tu choi can tu 3 den 300 ky tu.': 'Lý do từ chối cần từ 3 đến 300 ký tự.',
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
    images: Array.isArray(row?.images) ? row.images.filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(0, 4) : [],
    build_id: num(row?.build_id),
    verified: row?.verified === true,
    videos: normalizeVideos(row?.videos),
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

const STATUSES: VerifyStatus[] = ['none', 'pending', 'approved', 'rejected'];
const status = (v: unknown): VerifyStatus => (STATUSES.includes(v as VerifyStatus) ? (v as VerifyStatus) : 'none');

/** Chỉ giữ video có link https và tên game; tối đa 4. */
function normalizeVideos(v: unknown): VideoLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is VideoLink => !!x && typeof x.url === 'string' && x.url.startsWith('https://'))
    .map((x) => ({ game: str(x.game) || 'Game', url: x.url }))
    .slice(0, 4);
}

function normalizeBuild(row: SavedBuild): SavedBuild {
  return {
    id: row.id,
    created_at: Number(row.created_at) || 0,
    name: String(row.name ?? ''),
    parts: row.parts && typeof row.parts === 'object' ? row.parts : {},
    total_price: Number(row.total_price) || 0,
    verify_status: status(row.verify_status),
    verify_reason: str(row.verify_reason),
    verified_videos: normalizeVideos(row.verified_videos),
  };
}

function normalizeVerification(row: Verification): Verification {
  const s = status(row?.status);
  return {
    id: num(row?.id),
    created_at: num(row?.created_at),
    build_id: num(row?.build_id),
    user_id: num(row?.user_id),
    author_name: str(row?.author_name),
    build_name: str(row?.build_name),
    parts: row?.parts && typeof row.parts === 'object' ? row.parts : {},
    videos: normalizeVideos(row?.videos),
    note: str(row?.note),
    status: s === 'none' ? 'pending' : s,
    reject_reason: str(row?.reject_reason),
    reviewed_at: num(row?.reviewed_at),
  };
}
