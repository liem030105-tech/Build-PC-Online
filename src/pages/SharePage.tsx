import { Copy, Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CompatibilityPanel } from '@/components/builder/CompatibilityPanel';
import { FpsCard } from '@/components/builder/FpsCard';
import { PartTable } from '@/components/builder/PartTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { REQUIRED_CATEGORIES, buildItems, buildPrice, requiredCount, resolveBuild } from '@/data/parts';
import { copyText } from '@/lib/clipboard';
import { vnd } from '@/lib/format';
import { decodeBuild, shareUrl } from '@/lib/shareLink';
import { store } from '@/state/store';

/** Xem một build được chia sẻ qua link, ở chế độ chỉ đọc. */
export default function SharePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { build: ids, dropped } = useMemo(() => decodeBuild(params), [params]);
  const build = useMemo(() => resolveBuild(ids), [ids]);
  const count = buildItems(build).length;

  if (count === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <h1 className="text-xl font-semibold">Link build không hợp lệ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Link không chứa linh kiện nào, hoặc các linh kiện không còn trong danh mục.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Tự ráp một cấu hình</Link>
        </Button>
      </div>
    );
  }

  function edit() {
    const hasCurrent = Object.keys(store.state.build).length > 0;
    store.loadBuild(ids);
    if (hasCurrent) toast.info('Đã thay cấu hình đang ráp bằng build được chia sẻ.');
    navigate('/');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Build được chia sẻ</p>
          <h1 className="text-3xl font-semibold tracking-tight tabular-nums">{vnd(buildPrice(ids))}</h1>
          <p className="text-sm text-muted-foreground">
            {requiredCount(build)}/{REQUIRED_CATEGORIES.length} linh kiện chính
            {count > requiredCount(build) ? ` · ${count - requiredCount(build)} món tuỳ chọn` : ''}
            {dropped > 0 ? ` · ${dropped} linh kiện không còn trong danh mục nên đã bị bỏ` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => copyText(shareUrl(ids))}>
            <Copy />
            Sao chép link
          </Button>
          <Button onClick={edit}>
            <Pencil />
            Sửa build này
          </Button>
        </div>
      </div>
      <CompatibilityPanel build={build} />
      <PartTable build={build} />
      <FpsCard build={build} />
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Giá theo danh mục hiện tại của Build PC Online, có thể khác với lúc build được chia sẻ.
        </CardContent>
      </Card>
    </div>
  );
}
