import { Gauge } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GAMES } from '@/data/games';
import type { Build } from '@/data/parts';
import { cn } from '@/lib/utils';
import { estimateFps } from '@/sim/fps';

function fpsTone(fps: number): string {
  if (fps >= 144) return 'text-emerald-600 dark:text-emerald-400';
  if (fps >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

/** FPS ước tính ở 1080p cho từng game, tính từ CPU, RAM và card đồ họa. */
export function FpsCard({ build }: { build: Build }) {
  const results = GAMES.map((g) => ({ game: g, fps: estimateFps(build, g) }));
  const ready = results.some((r) => r.fps);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4.5" />
          Ước tính FPS
        </CardTitle>
        <CardDescription>
          {ready
            ? 'Ở 1080p. Số liệu mô phỏng để so sánh cấu hình, không phải benchmark thực tế.'
            : 'Chọn CPU, RAM và card đồ họa (hoặc CPU có đồ họa tích hợp) để xem ước tính.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {results.map(({ game, fps }) => (
          <div key={game.id} className="rounded-lg border p-3">
            <div className="truncate text-sm text-muted-foreground">{game.name}</div>
            {fps ? (
              <>
                <div className={cn('mt-1 text-2xl font-semibold tabular-nums', fpsTone(fps.avg))}>
                  {fps.avg}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">FPS</span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">1% low: {fps.low1}</div>
              </>
            ) : (
              <div className="mt-1 text-2xl font-semibold text-muted-foreground/50">—</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
