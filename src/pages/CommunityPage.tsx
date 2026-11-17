import { Plus, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PostCard } from '@/components/posts/PostCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PURPOSES } from '@/data/purposes';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Post, PostSort } from '@/net/xano';

export default function CommunityPage() {
  const { session, configured } = useSession();
  // Bộ lọc nằm trên URL để tải lại hoặc chia sẻ link vẫn giữ nguyên.
  const [params, setParams] = useSearchParams();
  const purpose = params.get('purpose');
  const sort: PostSort = params.get('sort') === 'top' ? 'top' : 'new';

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (page: number) => {
      setError(null);
      try {
        const res = await session.client.listPosts({ page, sort, purpose });
        setPosts((prev) => (page === 1 ? res.items : [...(prev ?? []), ...res.items]));
        setNextPage(res.nextPage);
        setTotal(res.itemsTotal);
      } catch (err) {
        setError(errorMessage(err));
        if (page === 1) setPosts([]);
      }
    },
    [session, sort, purpose],
  );

  useEffect(() => {
    if (!configured) return;
    setPosts(null);
    void load(1);
  }, [configured, load]);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  async function loadMore() {
    if (!nextPage) return;
    setLoadingMore(true);
    await load(nextPage);
    setLoadingMore(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cộng đồng</h1>
          <p className="text-sm text-muted-foreground">Xem cấu hình người khác đã ráp, thích và góp ý.</p>
        </div>
        <Button asChild>
          <Link to="/">
            <Plus />
            Đăng build của bạn
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
          {[{ id: null, label: 'Tất cả' }, ...PURPOSES].map((p) => (
            <button
              key={p.id ?? 'all'}
              onClick={() => update('purpose', p.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-sm transition-colors',
                purpose === p.id ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Select value={sort} onValueChange={(v) => update('sort', v === 'top' ? 'top' : null)}>
          <SelectTrigger className="sm:w-44" aria-label="Sắp xếp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Mới nhất</SelectItem>
            <SelectItem value="top">Nhiều lượt thích</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!configured && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Chưa cấu hình máy chủ</AlertTitle>
          <AlertDescription>Cần VITE_XANO_API_URL trong .env.local để xem bài đăng cộng đồng.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không tải được bài đăng</AlertTitle>
          <AlertDescription>
            {error}{' '}
            <button className="font-medium underline underline-offset-2" onClick={() => void load(1)}>
              Thử lại
            </button>
          </AlertDescription>
        </Alert>
      )}

      {configured && !posts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {posts && posts.length === 0 && !error && (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <p className="text-sm text-muted-foreground">
            {purpose ? 'Chưa có bài đăng nào cho nhu cầu này.' : 'Chưa có bài đăng nào.'}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Đăng build đầu tiên</Link>
          </Button>
        </div>
      )}

      {posts && posts.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Đang hiện {posts.length}/{total} bài
            </p>
            {nextPage && (
              <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? 'Đang tải…' : 'Tải thêm'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
