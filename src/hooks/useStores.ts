import { useMemo, useSyncExternalStore } from 'react';
import { resolveBuild } from '@/data/parts';
import { session } from '@/state/session';
import { store } from '@/state/store';

/** Build đang ráp (id theo loại) và các linh kiện đã tra từ danh mục. */
export function useBuild() {
  const { build: ids } = useSyncExternalStore(
    (fn) => store.subscribe(fn),
    () => store.state,
  );
  const build = useMemo(() => resolveBuild(ids), [ids]);
  return { ids, build, store };
}

/** Tài khoản đang đăng nhập (null nếu chưa), cùng client Xano. */
export function useSession() {
  const account = useSyncExternalStore(
    (fn) => session.subscribe(fn),
    () => session.account,
  );
  const ready = useSyncExternalStore(
    (fn) => session.subscribe(fn),
    () => session.ready,
  );
  return { account, ready, session, configured: session.client.configured };
}
