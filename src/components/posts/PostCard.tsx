import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PART_BY_ID } from '@/data/parts';
import { purposeLabel } from '@/data/purposes';
import { formatDate, vnd } from '@/lib/format';
import type { Post } from '@/net/xano';
import { LikeButton } from './LikeButton';

/** Thẻ tóm tắt bài đăng trong lưới Cộng đồng; bấm vào thẻ để mở chi tiết. */
export function PostCard({ post }: { post: Post }) {
  const name = (id?: string) => (id ? PART_BY_ID.get(id)?.name : undefined);
  const cpu = name(post.parts.cpu);
  // Không có card rời thì máy dùng đồ hoạ tích hợp của CPU.
  const gpu = name(post.parts.gpu) ?? (cpu ? 'Đồ hoạ tích hợp' : undefined);

  return (
    <Card className="relative transition-colors hover:border-foreground/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{purposeLabel(post.purpose)}</Badge>
          <span className="truncate">
            {post.author_name || 'Ẩn danh'} · {formatDate(post.created_at)}
          </span>
        </div>
        <CardTitle className="line-clamp-2 leading-snug">
          {/* Link phủ cả thẻ; nút thích nằm trên nó (relative z-10). */}
          <Link to={`/posts/${post.id}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 text-sm">
        <div className="truncate">
          <span className="text-muted-foreground">CPU: </span>
          {cpu ?? '—'}
        </div>
        <div className="truncate">
          <span className="text-muted-foreground">GPU: </span>
          {gpu ?? '—'}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-lg font-semibold tabular-nums">{vnd(post.total_price)}</span>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <LikeButton postId={post.id} count={post.like_count} className="relative z-10" />
          <span className="flex items-center gap-1 px-2 tabular-nums" aria-label={`${post.comment_count} bình luận`}>
            <MessageCircle className="size-4" />
            {post.comment_count}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
