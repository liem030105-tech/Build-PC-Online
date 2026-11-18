import { Gauge } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GAMES } from '@/data/games';
import type { Build } from '@/data/parts';
import { cn } from '@/lib/utils';
import { buildResolution, estimateFps } from '@/sim/fps';

function fpsTone(fps: number): string {
  if (fps >= 144) return 'text-emerald-600 dark:text-emerald-400';
  if (fps >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

/** FPS ước tính cho từng game theo độ phân giải màn hình (mặc định 1080p). */
export function FpsCard({ build }: { build: Build }) {
  const results = GAMES.map((g) => ({ game: g, fps: estimateFps(build, g) }));
  const ready = results.some((r) => r.fps);
  const resolution = buildResolution(build);
  const hz = build.monitor?.refreshHz;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4.5" />
          Ước tính FPS
        </CardTitle>
        <CardDescription>
          {ready
            ? `Ở ${resolution}${build.monitor ? ` theo màn hình ${build.monitor.name}` : ' (chọn màn hình để tính theo độ phân giải khác)'}. Số liệu mô phỏng để so sánh cấu hình, không phải benchmark thực tế.`
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
                {hz && (
                  <div
                    className={cn(
                      'mt-1 text-xs',
                      fps.avg >= hz ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {fps.avg >= hz ? `Đủ cho màn ${hz}Hz` : `Dưới ${hz}Hz của màn hình`}
                  </div>
                )}
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
