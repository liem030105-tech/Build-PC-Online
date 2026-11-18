import { ExternalLink } from 'lucide-react';
import { PLATFORM_LABEL, parseVideo } from '@/lib/video';
import type { VideoLink } from '@/net/xano';

/** Video theo game: YouTube nhúng thẳng, nền tảng khác là link mở tab mới. */
export function VideoList({ videos }: { videos: VideoLink[] }) {
  if (!videos.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {videos.map((v, i) => {
        const parsed = parseVideo(v.url);
        return (
          <div key={`${v.url}-${i}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{v.game}</span>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {parsed ? PLATFORM_LABEL[parsed.platform] : 'Mở video'}
                <ExternalLink className="size-3" />
              </a>
            </div>
            {parsed?.embedUrl ? (
              <iframe
                src={parsed.embedUrl}
                title={`Video ${v.game}`}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-lg border bg-muted"
              />
            ) : (
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex aspect-video w-full items-center justify-center gap-2 rounded-lg border bg-muted text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4" />
                Mở video trên {parsed ? PLATFORM_LABEL[parsed.platform] : 'trang gốc'}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
