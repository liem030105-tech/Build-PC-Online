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
