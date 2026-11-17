import { Megaphone, Save, Share2, Trash2 } from 'lucide-react';
import { PublishPostDialog } from '@/components/posts/PublishPostDialog';
import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CATEGORIES, buildPrice, type Build, type BuildIds } from '@/data/parts';
import { copyText } from '@/lib/clipboard';
import { vnd } from '@/lib/format';
import { shareUrl } from '@/lib/shareLink';
import { cn } from '@/lib/utils';
import { requiredWatt } from '@/sim/compatibility';
import { SaveBuildDialog } from './SaveBuildDialog';

interface Props {
  ids: BuildIds;
  build: Build;
  onReset: () => void;
}

function PowerMeter({ build }: { build: Build }) {
  const need = requiredWatt(build);
  const have = build.psu?.watt;
  const enough = have === undefined || have >= need;
  const pct = have ? Math.min(100, Math.round((need / have) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Công suất cần</span>
        <span className="tabular-nums">
          {build.cpu ? `${need}W` : '—'}
          {have ? <span className="text-muted-foreground"> / {have}W</span> : null}
        </span>
      </div>
      {have && build.cpu ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', enough ? 'bg-emerald-500' : 'bg-destructive')}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Nút "Tháo hết" kèm hộp thoại xác nhận. */
export function ResetBuildButton({
  onReset,
  disabled,
  className,
}: {
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className={cn('text-muted-foreground', className)} disabled={disabled}>
          <Trash2 />
          Tháo hết
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tháo hết linh kiện?</AlertDialogTitle>
          <AlertDialogDescription>
            Cấu hình đang ráp sẽ bị xoá. Các build đã lưu vào tài khoản không bị ảnh hưởng.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction onClick={onReset}>Tháo hết</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Tổng tiền, công suất và các nút Lưu / Chia sẻ / Tháo hết. */
export function BuildSummary({ ids, build, onReset }: Props) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const total = buildPrice(ids);
  const count = CATEGORIES.filter((c) => build[c.id]).length;
  const empty = count === 0;

  const actions = (
    <>
      <Button className="w-full" disabled={empty} onClick={() => setSaveOpen(true)}>
        <Save />
        Lưu build
      </Button>
      <Button variant="outline" className="w-full" disabled={empty} onClick={() => setPublishOpen(true)}>
        <Megaphone />
        Đăng lên cộng đồng
      </Button>
      <Button variant="outline" className="w-full" disabled={empty} onClick={() => copyText(shareUrl(ids))}>
        <Share2 />
        Chia sẻ link
      </Button>
    </>
  );

  return (
    <>
      {/* Desktop: thẻ cố định bên phải. */}
      <Card className="hidden lg:sticky lg:top-20 lg:flex">
        <CardHeader>
          <CardTitle>Tổng cấu hình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{vnd(total)}</div>
            <div className="text-sm text-muted-foreground">
              {count}/{CATEGORIES.length} linh kiện
            </div>
          </div>
          <Separator />
          <PowerMeter build={build} />
          <Separator />
          <div className="space-y-2">{actions}</div>
          <ResetBuildButton className="w-full" disabled={empty} onReset={onReset} />
        </CardContent>
      </Card>

      {/* Mobile: thanh cố định ở đáy màn hình. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold tabular-nums">{vnd(total)}</div>
            <div className="text-xs text-muted-foreground">
              {count}/{CATEGORIES.length} linh kiện
              {build.cpu ? ` · cần ${requiredWatt(build)}W` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon-lg" variant="outline" aria-label="Chia sẻ link" disabled={empty} onClick={() => copyText(shareUrl(ids))}>
              <Share2 />
            </Button>
            <Button
              size="icon-lg"
              variant="outline"
              aria-label="Đăng lên cộng đồng"
              disabled={empty}
              onClick={() => setPublishOpen(true)}
            >
              <Megaphone />
            </Button>
            <Button size="lg" disabled={empty} onClick={() => setSaveOpen(true)}>
              <Save />
              Lưu
            </Button>
          </div>
        </div>
      </div>

      <SaveBuildDialog ids={ids} open={saveOpen} onOpenChange={setSaveOpen} />
      <PublishPostDialog ids={ids} open={publishOpen} onOpenChange={setPublishOpen} />
    </>
  );
}
