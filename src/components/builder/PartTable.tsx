import { Plus, TriangleAlert, X } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CATEGORIES,
  MAX_DRIVES,
  MAX_FANS,
  hasCategory,
  specLine,
  type Build,
  type Category,
  type CategoryMeta,
  type Part,
  type SingleCategory,
} from '@/data/parts';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { partConflicts } from '@/sim/compatibility';
import { CATEGORY_ICON } from './categoryIcons';
import { PartPickerDialog } from './PartPickerDialog';

/** Các thao tác sửa build; không truyền thì bảng ở chế độ chỉ xem. */
export interface BuildActions {
  setSlot: (category: SingleCategory, id: string | null) => void;
  addDrive: (id: string) => void;
  removeDrive: (index: number) => void;
  setFan: (id: string | null, qty?: number) => void;
}

interface Props {
  build: Build;
  actions?: BuildActions;
}

function Conflicts({ build, part }: { build: Build; part: Part }) {
  const conflicts = partConflicts(build, part);
  if (!conflicts.length) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriangleAlert className="size-4 shrink-0 text-destructive" aria-label="Không tương thích" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{conflicts.join(' ')}</TooltipContent>
    </Tooltip>
  );
}

/** Tên + thông số + giá (trên mobile) của một linh kiện. */
function PartInfo({ build, part, qty = 1, extra }: { build: Build; part: Part; qty?: number; extra?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="truncate">{part.name}</span>
        <Conflicts build={build} part={part} />
      </div>
      <div className="truncate text-sm text-muted-foreground">{specLine(part)}</div>
      {extra}
      <div className="text-sm font-medium tabular-nums sm:hidden">
        {vnd(part.price * qty)}
        {qty > 1 && <span className="font-normal text-muted-foreground"> ({qty} × {vnd(part.price)})</span>}
      </div>
    </div>
  );
}

function Row({
  meta,
  children,
  price,
  actions,
}: {
  meta: CategoryMeta;
  children: ReactNode;
  price: number | null;
  actions?: ReactNode;
}) {
  const Icon = CATEGORY_ICON[meta.id];
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4">
      <div className="flex w-10 shrink-0 flex-col items-center gap-1 self-start sm:w-36 sm:flex-row sm:gap-2.5 sm:self-center">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4.5" />
        </span>
        <span className="hidden text-sm font-medium whitespace-nowrap sm:inline">{meta.label}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground sm:hidden">{meta.label}</div>
        {children}
      </div>
      <div
        className={cn(
          'hidden w-28 shrink-0 text-right text-sm tabular-nums sm:block',
          price === null && 'text-muted-foreground',
        )}
      >
        {price === null ? '—' : vnd(price)}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
}

/** Danh sách linh kiện: nhóm bắt buộc và nhóm tuỳ chọn, mỗi dòng là linh kiện đã chọn hoặc nút chọn. */
export function PartTable({ build, actions }: Props) {
  const [picking, setPicking] = useState<Category | null>(null);
  const editable = !!actions;
  const fanMax = Math.min(MAX_FANS, build.case?.fanSlots ?? 6);

  const chooseBtn = (c: Category, label = 'Chọn') => (
    <Button size="sm" onClick={() => setPicking(c)}>
      <Plus />
      {label}
    </Button>
  );
  const changeBtns = (c: Category, onRemove: () => void, label: string) => (
    <>
      <Button variant="outline" size="sm" onClick={() => setPicking(c)}>
        Đổi
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Bỏ ${label}`} onClick={onRemove}>
        <X />
      </Button>
    </>
  );
  const empty = (text = 'Chưa chọn') => <div className="text-sm text-muted-foreground">{text}</div>;

  function renderRow(meta: CategoryMeta) {
    const c = meta.id;

    if (c === 'drive') {
      const drives = build.drive ?? [];
      return (
        <Row
          key={c}
          meta={meta}
          price={drives.length ? drives.reduce((s, d) => s + d.price, 0) : null}
          actions={editable && drives.length < MAX_DRIVES ? chooseBtn(c, drives.length ? 'Thêm ổ' : 'Chọn') : undefined}
        >
          {drives.length === 0 && empty(`Tối đa ${MAX_DRIVES} ổ, không bắt buộc`)}
          <div className="space-y-2">
            {drives.map((d, i) => (
              <div key={`${d.id}-${i}`} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <PartInfo build={build} part={d} />
                </div>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label={`Bỏ ${d.name}`}
                    onClick={() => actions.removeDrive(i)}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Row>
      );
    }

    if (c === 'fan') {
      const fan = build.fan;
      return (
        <Row
          key={c}
          meta={meta}
          price={fan ? fan.part.price * fan.qty : null}
          actions={editable ? (fan ? changeBtns(c, () => actions.setFan(null), meta.label) : chooseBtn(c)) : undefined}
        >
          {fan ? (
            <PartInfo
              build={build}
              part={fan.part}
              qty={fan.qty}
              extra={
                editable ? (
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Số lượng</span>
                    <Select value={String(fan.qty)} onValueChange={(v) => actions.setFan(fan.part.id, Number(v))}>
                      <SelectTrigger size="sm" className="h-7 w-16" aria-label="Số lượng quạt">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.max(fanMax, fan.qty) }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Số lượng: {fan.qty}</div>
                )
              }
            />
          ) : (
            empty('Không bắt buộc')
          )}
        </Row>
      );
    }

    const part = build[c];
    const coolerNote =
      c === 'cooler' && !part && build.cpu
        ? build.cpu.boxCooler
          ? 'Không bắt buộc: CPU đã kèm quạt'
          : `Bắt buộc: ${build.cpu.name} không kèm quạt`
        : undefined;
    const gpuNote = c === 'gpu' && !part && build.cpu?.hasIGPU ? 'Không bắt buộc: CPU đã có đồ họa tích hợp' : undefined;
    return (
      <Row
        key={c}
        meta={meta}
        price={part ? part.price : null}
        actions={editable ? (part ? changeBtns(c, () => actions.setSlot(c, null), meta.label) : chooseBtn(c)) : undefined}
      >
        {part ? (
          <PartInfo build={build} part={part} />
        ) : (
          empty(coolerNote ?? gpuNote ?? (meta.optional ? 'Không bắt buộc' : 'Chưa chọn'))
        )}
      </Row>
    );
  }

  // Ở chế độ chỉ xem, ẩn các loại tuỳ chọn không có linh kiện.
  const optional = CATEGORIES.filter((c) => c.optional && (editable || hasCategory(build, c.id)));
  const groups = [
    { title: 'Linh kiện chính', items: CATEGORIES.filter((c) => !c.optional) },
    { title: 'Tuỳ chọn', items: optional },
  ].filter((g) => g.items.length);

  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y">
        {groups.map((g) => (
          <Fragment key={g.title}>
            <li className="bg-muted/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {g.title}
            </li>
            {g.items.map(renderRow)}
          </Fragment>
        ))}
      </ul>

      {editable && (
        <PartPickerDialog
          category={picking}
          build={build}
          onOpenChange={(open) => !open && setPicking(null)}
          onPick={(id) => {
            if (picking === 'drive') actions.addDrive(id);
            else if (picking === 'fan') actions.setFan(id);
            else if (picking) actions.setSlot(picking, id);
            setPicking(null);
          }}
        />
      )}
    </Card>
  );
}
