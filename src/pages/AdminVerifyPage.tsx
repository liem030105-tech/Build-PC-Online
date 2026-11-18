import { BadgeCheck, ShieldAlert, TriangleAlert, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { FpsCard } from '@/components/builder/FpsCard';
import { PartTable } from '@/components/builder/PartTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { VerifyBadge } from '@/components/verify/VerifyBadge';
import { VideoList } from '@/components/verify/VideoList';
import { buildPrice, resolveBuild, sanitizeIds } from '@/data/parts';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { formatDate, vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Verification } from '@/net/xano';

type Tab = Verification['status'];
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
];

function RequestCard({
  v,
  onApprove,
  onReject,
}: {
  v: Verification;
  onApprove: (v: Verification) => Promise<void>;
  onReject: (v: Verification) => void;
}) {
  const [busy, setBusy] = useState(false);
  const ids = sanitizeIds(v.parts).build;
  const build = resolveBuild(ids);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="truncate">{v.build_name || 'Build không tên'}</CardTitle>
          <VerifyBadge status={v.status} />
        </div>
        <CardDescription>
          {v.author_name || 'Ẩn danh'} gửi ngày {formatDate(v.created_at)} · {vnd(buildPrice(ids))}
          {v.reviewed_at ? ` · xử lý ngày ${formatDate(v.reviewed_at)}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {v.status === 'rejected' && v.reject_reason && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Lý do từ chối: {v.reject_reason}</p>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Video ({v.videos.length})</h3>
          <VideoList videos={v.videos} />
        </section>
        {v.note && (
          <section className="space-y-1">
            <h3 className="text-sm font-medium">Ghi chú của người gửi</h3>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{v.note}</p>
          </section>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Cấu hình khai báo</h3>
          <PartTable build={build} />
        </section>
        <FpsCard build={build} />
      </CardContent>
      {v.status === 'pending' && (
        <CardFooter className="gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onApprove(v);
              } finally {
                setBusy(false);
              }
            }}
          >
            <BadgeCheck />
            Duyệt
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => onReject(v)}>
            <XCircle />
            Từ chối
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function RejectDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: Verification | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (v: Verification, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      await onConfirm(target, reason.trim());
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Từ chối xác minh</DialogTitle>
            <DialogDescription>
              Người gửi sẽ thấy lý do này và có thể gửi lại yêu cầu với video khác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Lý do</Label>
            <Textarea
              id="reject-reason"
              required
              minLength={3}
              maxLength={300}
              rows={3}
              autoFocus
              placeholder="Ví dụ: Video không thấy FPS, không thấy linh kiện trong máy…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || reason.trim().length < 3}>
              {busy ? 'Đang gửi…' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVerifyPage() {
  const { account, ready, session, configured } = useSession();
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<Verification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Verification | null>(null);
  const isAdmin = account?.role === 'admin';

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      setItems(await session.client.listVerifications(tab));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session, tab]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!configured) return <Message title="Chưa cấu hình máy chủ">Cần VITE_XANO_API_URL để duyệt xác minh.</Message>;
  if (!ready) return <Message title="Đang kiểm tra đăng nhập…">Vui lòng đợi một chút.</Message>;
  if (!isAdmin) {
    return (
      <Message title="Không có quyền" icon>
        Trang này chỉ dành cho tài khoản quản trị.
      </Message>
    );
  }

  async function approve(v: Verification) {
    try {
      await session.client.approveVerification(v.id);
      toast.success(`Đã xác minh “${v.build_name || 'build'}”`);
      setItems((list) => list?.filter((x) => x.id !== v.id) ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function reject(v: Verification, reason: string) {
    try {
      await session.client.rejectVerification(v.id, reason);
      toast.success('Đã từ chối và gửi lý do cho người gửi');
      setItems((list) => list?.filter((x) => x.id !== v.id) ?? null);
      setRejecting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Duyệt xác minh</h1>
        <p className="text-sm text-muted-foreground">
          Xem video người dùng gửi, đối chiếu với cấu hình khai báo rồi duyệt hoặc từ chối.
        </p>
      </div>
      <AdminTabs />

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              tab === t.id ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
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

      {!items && !error && <Skeleton className="h-72 rounded-xl" />}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
          {tab === 'pending' ? 'Không có yêu cầu nào đang chờ duyệt.' : 'Chưa có yêu cầu nào.'}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-6">
          {items.map((v) => (
            <RequestCard key={v.id} v={v} onApprove={approve} onReject={setRejecting} />
          ))}
        </div>
      )}

      <RejectDialog target={rejecting} onOpenChange={(open) => !open && setRejecting(null)} onConfirm={reject} />
    </div>
  );
}

function Message({ title, children, icon }: { title: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      {icon && <ShieldAlert className="mb-3 size-8 text-muted-foreground" />}
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
