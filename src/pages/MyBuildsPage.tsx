import { BadgeCheck, FolderOpen, Megaphone, Plus, Share2, Trash2, TriangleAlert } from 'lucide-react';
import { PublishPostDialog } from '@/components/posts/PublishPostDialog';
import { VerifyBadge } from '@/components/verify/VerifyBadge';
import { VerifyRequestDialog } from '@/components/verify/VerifyRequestDialog';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PART_BY_ID, REQUIRED_CATEGORIES, requiredCount, resolveBuild } from '@/data/parts';
import { useSession } from '@/hooks/useStores';
import { copyText } from '@/lib/clipboard';
import { errorMessage } from '@/lib/errors';
import { formatDate, vnd } from '@/lib/format';
import { shareUrl } from '@/lib/shareLink';
import type { SavedBuild } from '@/net/xano';
import { store } from '@/state/store';

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function BuildCard({
  b,
  onDelete,
  onVerify,
}: {
  b: SavedBuild;
  onDelete: (b: SavedBuild) => void;
  onVerify: (b: SavedBuild) => void;
}) {
  const navigate = useNavigate();
  const [publishOpen, setPublishOpen] = useState(false);
  const name = (id?: string) => (id ? PART_BY_ID.get(id)?.name : undefined);
  const count = requiredCount(resolveBuild(b.parts));

  function open() {
    const dropped = store.loadBuild(b.parts);
    if (dropped > 0) toast.warning(`${dropped} linh kiện không còn trong danh mục nên đã bị bỏ.`);
    navigate('/');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{b.name || 'Build không tên'}</CardTitle>
        <CardDescription>
          Lưu ngày {formatDate(b.created_at)} · {count}/{REQUIRED_CATEGORIES.length} linh kiện chính
        </CardDescription>
        {b.verify_status !== 'none' && <VerifyBadge status={b.verify_status} className="mt-1 w-fit" />}
      </CardHeader>
      <CardContent className="flex-1 space-y-1 text-sm">
        <div className="truncate">
          <span className="text-muted-foreground">CPU: </span>
          {name(b.parts.cpu) ?? '—'}
        </div>
        <div className="truncate">
          <span className="text-muted-foreground">GPU: </span>
          {name(b.parts.gpu) ?? '—'}
        </div>
        <div className="pt-2 text-lg font-semibold tabular-nums">{vnd(b.total_price)}</div>
        {b.verify_status === 'rejected' && b.verify_reason && (
          <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">Lý do: {b.verify_reason}</p>
        )}
        {b.verify_status === 'pending' && (
          <p className="text-xs text-muted-foreground">Admin đang xem video, bạn sẽ thấy kết quả tại đây.</p>
        )}
        {(b.verify_status === 'none' || b.verify_status === 'rejected') && (
          <Button variant="link" size="sm" className="h-auto px-0" onClick={() => onVerify(b)}>
            <BadgeCheck />
            {b.verify_status === 'rejected' ? 'Gửi lại yêu cầu xác minh' : 'Yêu cầu xác minh'}
          </Button>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={open}>
          <FolderOpen />
          Mở
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPublishOpen(true)}>
          <Megaphone />
          Đăng bài
        </Button>
        <Button size="icon" variant="ghost" aria-label="Sao chép link chia sẻ" onClick={() => copyText(shareUrl(b.parts))}>
          <Share2 />
        </Button>
        <PublishPostDialog
          ids={b.parts}
          open={publishOpen}
          onOpenChange={setPublishOpen}
          defaultTitle={b.name}
          buildId={b.id}
          verified={b.verify_status === 'approved'}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="ml-auto text-muted-foreground" aria-label="Xoá build">
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá “{b.name || 'Build không tên'}”?</AlertDialogTitle>
              <AlertDialogDescription>Build sẽ bị xoá khỏi tài khoản và không khôi phục được.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onDelete(b)}>
                Xoá
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function MyBuildsPage() {
  const { account, ready, session, configured } = useSession();
  const [builds, setBuilds] = useState<SavedBuild[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<SavedBuild | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await session.client.listBuilds();
      setBuilds([...list].sort((a, b) => b.created_at - a.created_at));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session]);

  useEffect(() => {
    if (account) void load();
    else setBuilds(null);
  }, [account, load]);

  async function remove(b: SavedBuild) {
    try {
      await session.client.deleteBuild(b.id);
      setBuilds((list) => list?.filter((x) => x.id !== b.id) ?? null);
      toast.success('Đã xoá build');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (!configured) {
    return (
      <Message title="Chưa bật lưu online">
        Cần cấu hình máy chủ Xano (VITE_XANO_API_URL trong .env.local) để lưu build vào tài khoản. Trong lúc chờ, bạn
        vẫn có thể chia sẻ build qua link.
      </Message>
    );
  }
  if (!ready) return <Message title="Đang kiểm tra đăng nhập…">Vui lòng đợi một chút.</Message>;
  if (!account) {
    return (
      <Message title="Đăng nhập để xem build đã lưu">
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/signup">Tạo tài khoản</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Đăng nhập</Link>
          </Button>
        </div>
      </Message>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build của tôi</h1>
          <p className="text-sm text-muted-foreground">Các cấu hình bạn đã lưu vào tài khoản.</p>
        </div>
        <Button asChild>
          <Link to="/">
            <Plus />
            Build mới
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không tải được danh sách</AlertTitle>
          <AlertDescription>
            {error}{' '}
            <button className="font-medium underline underline-offset-2" onClick={() => void load()}>
              Thử lại
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!builds && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {builds && builds.length === 0 && (
        <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
          Chưa có build nào. Ráp một cấu hình rồi bấm <span className="font-medium text-foreground">Lưu build</span>.
        </div>
      )}

      {builds && builds.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <BuildCard key={b.id} b={b} onDelete={remove} onVerify={setVerifying} />
          ))}
        </div>
      )}

      <VerifyRequestDialog
        build={verifying}
        onOpenChange={(open) => !open && setVerifying(null)}
        onSubmitted={(id) =>
          setBuilds((list) =>
            list?.map((x) => (x.id === id ? { ...x, verify_status: 'pending', verify_reason: '' } : x)) ?? null,
          )
        }
      />
    </div>
  );
}
