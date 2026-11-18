import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Ảnh lớn + hàng ảnh nhỏ; bấm ảnh lớn để xem toàn màn hình. */
export function PostGallery({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (!urls.length) return null;
  const current = urls[Math.min(index, urls.length - 1)];
  const step = (d: number) => setIndex((i) => (i + d + urls.length) % urls.length);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="block w-full overflow-hidden rounded-xl border bg-muted"
        onClick={() => setZoom(true)}
        aria-label="Xem ảnh lớn"
      >
        <img src={current} alt={title} className="aspect-video w-full object-contain" />
      </button>
      {urls.length > 1 && (
        <div className="flex gap-2">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ảnh ${i + 1}`}
              className={cn(
                'size-16 overflow-hidden rounded-lg border-2 sm:size-20',
                i === index ? 'border-foreground' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={u} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[95vw] border-0 bg-black/95 p-2 sm:max-w-5xl">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="relative">
            <img src={current} alt={title} className="max-h-[85svh] w-full object-contain" />
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Ảnh trước"
                  className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Ảnh sau"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  {index + 1}/{urls.length}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
