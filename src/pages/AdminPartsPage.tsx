import { Pencil, Plus, Search, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { PartFormDialog } from '@/components/admin/PartFormDialog';
import { ALL_SPEC_KEYS } from '@/components/admin/partFields';
import { CATEGORY_ICON } from '@/components/builder/categoryIcons';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { rowToPart, type PartRow } from '@/data/catalog';
import { CATEGORIES, specLine, type Category } from '@/data/parts';
import { useCatalog } from '@/hooks/useCatalog';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

type Row = Record<string, unknown> & { id: number };

/** Lấy đúng các cột của bảng `part` từ dòng thô (bỏ id, created_at). */
function toPartRow(raw: Row, patch: Partial<PartRow> = {}): PartRow {
  const row: Record<string, unknown> = { key: raw.key, category: raw.category, name: raw.name, price: raw.price };
  for (const key of ALL_SPEC_KEYS) row[key] = raw[key] ?? null;
  return { ...(row as unknown as PartRow), ...patch };
}

function PriceCell({ row, onSave }: { row: Row; onSave: (price: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.price ?? 0));
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return;
    if (price === row.price) return setEditing(false);
    setSaving(true);
    try {
      await onSave(price);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="rounded px-1.5 py-0.5 tabular-nums hover:bg-muted"
        title="Bấm để sửa giá"
        onClick={() => {
          setValue(String(row.price ?? 0));
          setEditing(true);
        }}
      >
        {vnd(Number(row.price) || 0)}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="flex items-center justify-end gap-1">
      <Input
        autoFocus
        type="number"
        min={0}
        step={1000}
        className="h-7 w-32 text-right"
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        aria-label="Giá mới"
      />
      <Button type="submit" size="sm" disabled={saving}>
        Lưu
      </Button>
    </form>
  );
}

export default function AdminPartsPage() {
  const { account, ready, session, configured } = useSession();
  const catalog = useCatalog();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('cpu');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ row: Row | null } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const isAdmin = account?.role === 'admin';

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = (await session.client.listParts()) as Row[];
      setRows(list.filter((r) => typeof r?.id === 'number'));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  /** Sau mỗi lần sửa: tải lại bảng ở trang này và danh mục cho cả web. */
  async function refresh() {
    await Promise.all([load(), catalog.reload()]);
  }

  const counts = useMemo(() => {
    const c: Partial<Record<string, number>> = {};
    for (const r of rows ?? []) c[String(r.category)] = (c[String(r.category)] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => r.category === category)
      .filter((r) => !q || `${r.name} ${r.key}`.toLowerCase().includes(q))
      .sort((a, b) => Number(a.price) - Number(b.price));
  }, [rows, category, query]);

  if (!configured) {
    return <Message title="Chưa cấu hình máy chủ">Cần VITE_XANO_API_URL để quản trị danh mục.</Message>;
  }
  if (!ready) return <Message title="Đang kiểm tra đăng nhập…">Vui lòng đợi một chút.</Message>;
  if (!isAdmin) {
    return (
      <Message title="Không có quyền" icon>
        Trang này chỉ dành cho tài khoản quản trị.
      </Message>
    );
  }

  async function save(row: PartRow) {
    if (form?.row) await session.client.updatePart(form.row.id, row);
    else await session.client.createPart(row);
    toast.success(form?.row ? `Đã lưu ${row.name}` : `Đã thêm ${row.name}`);
    setForm(null);
    await refresh();
  }

  async function savePrice(row: Row, price: number) {
    try {
      await session.client.updatePart(row.id, toPartRow(row, { price }));
      toast.success(`Đã đổi giá ${String(row.name)}`);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  }

  async function remove(row: Row) {
    try {
      await session.client.deletePart(row.id);
      toast.success(`Đã xoá ${String(row.name)}`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const meta = CATEGORIES.find((c) => c.id === category)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản trị linh kiện</h1>
          <p className="text-sm text-muted-foreground">
            Thêm, sửa giá hoặc xoá linh kiện. Thay đổi áp dụng ngay cho mọi người dùng.
          </p>
        </div>
        <Button onClick={() => setForm({ row: null })}>
          <Plus />
          Thêm {meta.label}
        </Button>
      </div>
      <AdminTabs />

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                category === c.id ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" />
              {c.label}
              <span className="tabular-nums opacity-60">{counts[c.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm theo tên hoặc mã…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không tải được danh mục</AlertTitle>
          <AlertDescription>
            {error}{' '}
            <button className="font-medium underline underline-offset-2" onClick={() => void load()}>
              Thử lại
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!rows && !error && <Skeleton className="h-64 rounded-xl" />}

      {rows && (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {visible.map((r) => {
              const part = rowToPart(r);
              return (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="truncate">{String(r.name)}</span>
                      {!part && <Badge variant="destructive">Thiếu thông số</Badge>}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      <code className="text-xs">{String(r.key)}</code>
                      {part ? ` · ${specLine(part)}` : ' · Web đang bỏ qua dòng này cho tới khi sửa đủ thông số'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <PriceCell row={r} onSave={(price) => savePrice(r, price)} />
                    <div className="flex">
                      <Button variant="ghost" size="icon" aria-label={`Sửa ${String(r.name)}`} onClick={() => setForm({ row: r })}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label={`Xoá ${String(r.name)}`}
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                {query ? 'Không có linh kiện nào khớp.' : `Chưa có ${meta.label.toLowerCase()} nào.`}
              </li>
            )}
          </ul>
        </Card>
      )}

      <PartFormDialog
        category={category}
        row={form?.row ?? null}
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        onSubmit={save}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá “{String(deleting?.name ?? '')}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Linh kiện bị xoá khỏi danh mục. Build đã lưu, link chia sẻ và bài đăng đang dùng linh kiện này sẽ hiển thị
              thiếu nó. Không khôi phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleting && void remove(deleting)}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
