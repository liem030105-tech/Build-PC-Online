import { Search, TriangleAlert } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CATEGORY_BY_ID, partsOf, specLine, type Build, type Category } from '@/data/parts';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { partConflicts } from '@/sim/compatibility';

type Sort = 'price-asc' | 'price-desc' | 'name';

/** Bỏ dấu tiếng Việt và viết thường, để tìm "nguon" vẫn ra "Nguồn". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

interface Props {
  /** Loại đang chọn; null thì hộp thoại đóng. */
  category: Category | null;
  build: Build;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
}

export function PartPickerDialog({ category, build, onOpenChange, onPick }: Props) {
  // Giữ loại cuối cùng để nội dung không biến mất khi hộp thoại đang đóng (hiệu ứng mờ dần).
  const last = useRef<Category>('cpu');
  if (category) last.current = category;
  const shown = category ?? last.current;

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <PickerBody key={shown} category={shown} build={build} onPick={onPick} />
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ category, build, onPick }: { category: Category; build: Build; onPick: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('price-asc');
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const meta = CATEGORY_BY_ID[category];
  // Ổ cứng thêm được chọn trùng mẫu (2 ổ giống nhau), nên không đánh dấu "Đang chọn".
  const selectedId =
    category === 'drive' ? undefined : category === 'fan' ? build.fan?.part.id : build[category]?.id;

  const { items, hidden } = useMemo(() => {
    const q = fold(query.trim());
    const all = partsOf(category)
      .filter((p) => !q || fold(`${p.name} ${specLine(p)}`).includes(q))
      .map((p) => ({ part: p, conflicts: partConflicts(build, p) }));
    const visible = onlyCompatible ? all.filter((x) => x.conflicts.length === 0) : all;
    visible.sort((a, b) =>
      sort === 'name'
        ? a.part.name.localeCompare(b.part.name, 'vi')
        : sort === 'price-asc'
          ? a.part.price - b.part.price
          : b.part.price - a.part.price,
    );
    return { items: visible, hidden: all.length - visible.length };
  }, [category, build, query, sort, onlyCompatible]);

  return (
    <>
      <DialogHeader className="border-b p-4 pb-3">
        <DialogTitle>Chọn {meta.label}</DialogTitle>
        <DialogDescription>Linh kiện không lắp được với cấu hình hiện tại sẽ được đánh dấu.</DialogDescription>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Tìm theo tên hoặc thông số…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="sm:w-40" aria-label="Sắp xếp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Giá tăng dần</SelectItem>
              <SelectItem value="price-desc">Giá giảm dần</SelectItem>
              <SelectItem value="name">Tên A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Switch id="only-compatible" checked={onlyCompatible} onCheckedChange={setOnlyCompatible} />
          <Label htmlFor="only-compatible" className="font-normal">
            Chỉ hiện linh kiện tương thích
          </Label>
        </div>
      </DialogHeader>

      <ul className="flex-1 divide-y overflow-y-auto">
        {items.map(({ part, conflicts }) => {
          const selected = part.id === selectedId;
          return (
            <li key={part.id} className={cn('flex items-center gap-3 px-4 py-3', selected && 'bg-muted/60')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{part.name}</span>
                  {selected && <Badge variant="secondary">Đang chọn</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">{specLine(part)}</div>
                {conflicts.map((c) => (
                  <div key={c} className="mt-1 flex gap-1.5 text-xs text-destructive">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    {c}
                  </div>
                ))}
              </div>
              <div className="shrink-0 text-right text-sm font-medium tabular-nums">{vnd(part.price)}</div>
              <Button
                size="sm"
                variant={conflicts.length ? 'outline' : 'default'}
                disabled={selected}
                onClick={() => onPick(part.id)}
              >
                Chọn
              </Button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            Không có linh kiện nào phù hợp{query ? ` với “${query}”` : ''}.
          </li>
        )}
      </ul>

      {hidden > 0 && (
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          Đang ẩn {hidden} linh kiện không tương thích.{' '}
          <button className="font-medium text-foreground underline underline-offset-2" onClick={() => setOnlyCompatible(false)}>
            Hiện tất cả
          </button>
        </div>
      )}
    </>
  );
}
