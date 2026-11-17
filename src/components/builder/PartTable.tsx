import { Plus, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CATEGORIES, specLine, type Build, type Category } from '@/data/parts';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { partConflicts } from '@/sim/compatibility';
import { CATEGORY_ICON } from './categoryIcons';
import { PartPickerDialog } from './PartPickerDialog';

interface Props {
  build: Build;
  /** Không truyền thì bảng ở chế độ chỉ xem (trang chia sẻ). */
  onChange?: (category: Category, id: string | null) => void;
}

/** Danh sách 7 loại linh kiện, mỗi dòng là linh kiện đã chọn hoặc nút chọn. */
export function PartTable({ build, onChange }: Props) {
  const [picking, setPicking] = useState<Category | null>(null);
  const editable = !!onChange;

  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y">
        {CATEGORIES.map((c) => {
          const part = build[c.id];
          const Icon = CATEGORY_ICON[c.id];
          const conflicts = part ? partConflicts(build, part) : [];
          const gpuOptional = c.id === 'gpu' && !part && build.cpu?.hasIGPU;

          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
              <div className="flex w-10 shrink-0 flex-col items-center gap-1 sm:w-36 sm:flex-row sm:gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <span className="hidden text-sm font-medium whitespace-nowrap sm:inline">{c.label}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground sm:hidden">{c.label}</div>
                {part ? (
                  <>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{part.name}</span>
                      {conflicts.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TriangleAlert className="size-4 shrink-0 text-destructive" aria-label="Không tương thích" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-72">{conflicts.join(' ')}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{specLine(part)}</div>
                    <div className="text-sm font-medium tabular-nums sm:hidden">{vnd(part.price)}</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {gpuOptional ? 'Không bắt buộc: CPU đã có đồ họa tích hợp' : 'Chưa chọn'}
                  </div>
                )}
              </div>

              <div
                className={cn(
                  'hidden w-28 shrink-0 text-right text-sm tabular-nums sm:block',
                  !part && 'text-muted-foreground',
                )}
              >
                {part ? vnd(part.price) : '—'}
              </div>

              {editable && (
                <div className="flex shrink-0 items-center gap-1">
                  {part ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setPicking(c.id)}>
                        Đổi
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Bỏ ${c.label}`}
                        onClick={() => onChange(c.id, null)}
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setPicking(c.id)}>
                      <Plus />
                      Chọn
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {editable && (
        <PartPickerDialog
          category={picking}
          build={build}
          onOpenChange={(open) => !open && setPicking(null)}
          onPick={(id) => {
            if (picking) onChange(picking, id);
            setPicking(null);
          }}
        />
      )}
    </Card>
  );
}
