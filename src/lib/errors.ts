import { XanoError } from '@/net/xano';
import { session } from '@/state/session';

/** Câu báo lỗi tiếng Việt cho người dùng. Lỗi 401 thì đăng xuất luôn, vì token đã bị xoá. */
export function errorMessage(err: unknown): string {
  if (err instanceof XanoError && err.status === 401) session.logout();
  if (err instanceof Error && err.message) return err.message;
  return 'Có lỗi xảy ra, hãy thử lại.';
}
