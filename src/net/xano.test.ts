import { describe, expect, it } from 'vitest';
import { XanoClient, XanoError } from './xano';

const API = 'https://example.xano.io/api:test';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** fetch giả: trả lời theo "METHOD /path", ghi lại mọi lần gọi. */
function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({
      url,
      method,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const route = routes[`${method} ${url.replace(API, '')}`];
    if (!route) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    return new Response(route.body === undefined ? '' : JSON.stringify(route.body), {
      status: route.status ?? 200,
    });
  }) as typeof fetch;
  return { fn, calls };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const ME = { id: 7, created_at: 1, name: 'Tester', email: 'a@b.c' };

describe('XanoClient', () => {
  it('đăng nhập: lưu token rồi lấy thông tin tài khoản bằng token đó', async () => {
    const { fn, calls } = fakeFetch({
      'POST /auth/login': { body: { authToken: 'tok-1' } },
      'GET /auth/me': { body: ME },
    });
    const storage = memoryStorage();
    const client = new XanoClient({ apiUrl: API + '/', fetch: fn, storage });

    const account = await client.login('a@b.c', 'secret');

    expect(account).toEqual({ id: 7, name: 'Tester', email: 'a@b.c' });
    expect(calls[0].body).toEqual({ email: 'a@b.c', password: 'secret' });
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[1].headers.Authorization).toBe('Bearer tok-1');
    expect(storage.data.get('buildpc-auth-token')).toBe('tok-1');
    expect(client.hasToken).toBe(true);
  });

  it('đăng ký gửi đủ tên, email, mật khẩu', async () => {
    const { fn, calls } = fakeFetch({
      'POST /auth/signup': { body: { authToken: 'tok-2' } },
      'GET /auth/me': { body: ME },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    await client.signup('Tester', 'a@b.c', 'secret');
    expect(calls[0].body).toEqual({ name: 'Tester', email: 'a@b.c', password: 'secret' });
  });

  it('dùng lại token đã lưu từ lần trước', async () => {
    const { fn, calls } = fakeFetch({ 'GET /build': { body: [] } });
    const storage = memoryStorage({ 'buildpc-auth-token': 'old' });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage });
    await client.listBuilds();
    expect(calls[0].headers.Authorization).toBe('Bearer old');
  });

  it('lưu build gửi tên, linh kiện và tổng giá', async () => {
    const parts = { cpu: 'cpu-7600', gpu: 'gpu-4060' };
    const { fn, calls } = fakeFetch({
      'POST /build': { body: { id: 3, created_at: 99, name: 'Máy 1', parts, total_price: 13_200_000 } },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage({ 'buildpc-auth-token': 't' }) });
    const saved = await client.saveBuild('Máy 1', parts, 13_200_000);
    expect(calls[0].body).toEqual({ name: 'Máy 1', parts, total_price: 13_200_000 });
    expect(saved).toEqual({ id: 3, created_at: 99, name: 'Máy 1', parts, total_price: 13_200_000 });
  });

  it('chuẩn hóa dữ liệu build hỏng từ máy chủ', async () => {
    const { fn } = fakeFetch({
      'GET /build': { body: [{ id: 1, created_at: '5', name: null, parts: null, total_price: 'x' }] },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    expect(await client.listBuilds()).toEqual([{ id: 1, created_at: 5, name: '', parts: {}, total_price: 0 }]);
  });

  it('xóa build gọi đúng đường dẫn và chấp nhận phản hồi rỗng', async () => {
    const { fn, calls } = fakeFetch({ 'DELETE /build/3': {} });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    await client.deleteBuild(3);
    expect(calls[0].url).toBe(API + '/build/3');
    expect(calls[0].method).toBe('DELETE');
  });

  it('đổi lỗi sai mật khẩu của Xano sang tiếng Việt', async () => {
    const { fn } = fakeFetch({
      'POST /auth/login': { status: 500, body: { code: 'ERROR_FATAL', message: 'Invalid Credentials.' } },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    await expect(client.login('a@b.c', 'wrong')).rejects.toMatchObject({
      message: 'Email hoặc mật khẩu không đúng.',
      status: 500,
    });
    expect(client.hasToken).toBe(false);
  });

  it('giữ nguyên thông điệp lạ và báo rõ lỗi dữ liệu nhập', async () => {
    const { fn } = fakeFetch({
      'POST /build': { status: 400, body: { code: 'ERROR_CODE_INPUT_ERROR', message: 'Missing param: name' } },
      'DELETE /build/9': { status: 404, body: { message: 'Khong tim thay build.' } },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    await expect(client.saveBuild('', {}, 0)).rejects.toMatchObject({
      message: 'Thông tin nhập chưa hợp lệ: Missing param: name',
    });
    await expect(client.deleteBuild(9)).rejects.toMatchObject({ message: 'Khong tim thay build.', status: 404 });
  });

  it('bỏ token khi máy chủ trả 401 (hết hạn)', async () => {
    const { fn } = fakeFetch({ 'GET /build': { status: 401, body: { message: 'Unauthorized' } } });
    const storage = memoryStorage({ 'buildpc-auth-token': 'expired' });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage });
    await expect(client.listBuilds()).rejects.toBeInstanceOf(XanoError);
    expect(client.hasToken).toBe(false);
    expect(storage.data.has('buildpc-auth-token')).toBe(false);
  });

  it('báo lỗi mạng bằng tiếng Việt', async () => {
    const fn = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });
    await expect(client.listBuilds()).rejects.toMatchObject({ status: 0 });
  });

  it('không gọi mạng khi chưa cấu hình API URL', async () => {
    const { fn, calls } = fakeFetch({});
    const client = new XanoClient({ apiUrl: '', fetch: fn, storage: memoryStorage() });
    expect(client.configured).toBe(false);
    await expect(client.listBuilds()).rejects.toBeInstanceOf(XanoError);
    expect(calls).toHaveLength(0);
  });

  it('dùng authUrl riêng cho đăng nhập nếu có', async () => {
    const { fn, calls } = fakeFetch({});
    const client = new XanoClient({ apiUrl: API, authUrl: 'https://example.xano.io/api:auth', fetch: fn, storage: memoryStorage() });
    await client.login('a@b.c', 'x').catch(() => {});
    expect(calls[0].url).toBe('https://example.xano.io/api:auth/auth/login');
  });
});

describe('XanoClient: bài đăng cộng đồng', () => {
  const POST = {
    id: 3,
    created_at: 100,
    user_id: 7,
    author_name: 'Tester',
    title: 'PC chơi game',
    description: 'Mô tả',
    purpose: 'gaming',
    parts: { cpu: 'cpu-7600' },
    total_price: 5200000,
    like_count: 2,
    comment_count: 1,
  };

  it('lấy danh sách bài không cần đăng nhập, gửi trang, sắp xếp và nhu cầu', async () => {
    const { fn, calls } = fakeFetch({
      'GET /post?page=2&sort=top&purpose=gaming': {
        body: { items: [POST], curPage: 2, nextPage: 3, itemsTotal: 30 },
      },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });

    const page = await client.listPosts({ page: 2, sort: 'top', purpose: 'gaming' });

    expect(page).toEqual({ items: [POST], curPage: 2, nextPage: 3, itemsTotal: 30 });
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('bỏ tham số nhu cầu khi xem tất cả, chuẩn hoá bài thiếu trường', async () => {
    const { fn } = fakeFetch({
      'GET /post?page=1&sort=new': { body: { items: [{ id: 9, title: 'X', parts: null }], nextPage: null } },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });

    const page = await client.listPosts();

    expect(page.nextPage).toBeNull();
    expect(page.items[0]).toMatchObject({ id: 9, title: 'X', parts: {}, purpose: 'other', like_count: 0, author_name: '' });
  });

  it('chi tiết bài trả kèm bình luận', async () => {
    const comment = { id: 1, created_at: 200, post_id: 3, user_id: 8, author_name: 'B', content: 'Đẹp' };
    const { fn } = fakeFetch({ 'GET /post/3': { body: { post: POST, comments: [comment] } } });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });

    expect(await client.getPost(3)).toEqual({ ...POST, comments: [comment] });
  });

  it('đăng bài gửi đúng các trường, có token', async () => {
    const { fn, calls } = fakeFetch({ 'POST /post': { body: POST } });
    const client = new XanoClient({
      apiUrl: API,
      fetch: fn,
      storage: memoryStorage({ 'buildpc-auth-token': 'tok' }),
    });

    await client.createPost({
      title: 'PC chơi game',
      description: 'Mô tả',
      purpose: 'gaming',
      parts: { cpu: 'cpu-7600' },
      totalPrice: 5200000,
    });

    expect(calls[0].headers.Authorization).toBe('Bearer tok');
    expect(calls[0].body).toEqual({
      title: 'PC chơi game',
      description: 'Mô tả',
      purpose: 'gaming',
      parts: { cpu: 'cpu-7600' },
      total_price: 5200000,
    });
  });

  it('thích / bỏ thích trả trạng thái mới, danh sách đã thích là các id bài', async () => {
    const { fn } = fakeFetch({
      'POST /post/3/like': { body: { liked: true, like_count: 3 } },
      'GET /post_like': { body: [{ id: 1, post_id: 3 }, { id: 2, post_id: 5 }] },
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage({ 'buildpc-auth-token': 't' }) });

    expect(await client.toggleLike(3)).toEqual({ liked: true, likeCount: 3 });
    expect(await client.likedPostIds()).toEqual([3, 5]);
  });

  it('bình luận và xoá gọi đúng đường dẫn', async () => {
    const { fn, calls } = fakeFetch({
      'POST /post/3/comment': { body: { id: 4, post_id: 3, content: 'Hay' } },
      'DELETE /comment/4': {},
      'DELETE /post/3': {},
    });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage({ 'buildpc-auth-token': 't' }) });

    expect((await client.addComment(3, 'Hay')).content).toBe('Hay');
    await client.deleteComment(4);
    await client.deletePost(3);
    expect(calls.map((c) => `${c.method} ${c.url.replace(API, '')}`)).toEqual([
      'POST /post/3/comment',
      'DELETE /comment/4',
      'DELETE /post/3',
    ]);
    expect(calls[0].body).toEqual({ content: 'Hay' });
  });

  it('đổi thông báo lỗi không dấu của máy chủ sang tiếng Việt có dấu', async () => {
    const { fn } = fakeFetch({ 'POST /post': { status: 400, body: { message: 'Tieu de can tu 3 den 120 ky tu.' } } });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage({ 'buildpc-auth-token': 't' }) });

    await expect(
      client.createPost({ title: 'ab', description: '', purpose: 'other', parts: {}, totalPrice: 0 }),
    ).rejects.toThrow('Tiêu đề cần từ 3 đến 120 ký tự.');
  });

  it('báo quá tải khi gói Free vượt giới hạn request', async () => {
    const { fn } = fakeFetch({ 'GET /post?page=1&sort=new': { status: 429, body: { message: 'Whoa there!' } } });
    const client = new XanoClient({ apiUrl: API, fetch: fn, storage: memoryStorage() });

    await expect(client.listPosts()).rejects.toThrow('Máy chủ đang quá tải');
  });
});
