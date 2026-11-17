import { Heart } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { likes } from '@/state/likes';

interface Props {
  postId: number;
  count: number;
  size?: 'sm' | 'default';
  className?: string;
}

/** Nút thích: đổi ngay trên giao diện, gọi máy chủ, lỗi thì hoàn lại. */
export function LikeButton({ postId, count: initialCount, size = 'sm', className }: Props) {
  const { account, session } = useSession();
  const navigate = useNavigate();
  const ids = useSyncExternalStore(
    (fn) => likes.subscribe(fn),
    () => likes.ids,
  );
  const liked = ids.has(postId);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => setCount(initialCount), [initialCount]);
  useEffect(() => {
    void likes.ensureLoaded();
  }, [account]);

  async function toggle(e: React.MouseEvent) {
    // Nút nằm trong thẻ có link: không cho bấm thích mở trang chi tiết.
    e.preventDefault();
    e.stopPropagation();
    if (!account) {
      toast.info('Đăng nhập để thích bài đăng.');
      navigate('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    const before = { liked, count };
    likes.set(postId, !liked);
    setCount(count + (liked ? -1 : 1));
    try {
      const res = await session.client.toggleLike(postId);
      likes.set(postId, res.liked);
      setCount(res.likeCount);
    } catch (err) {
      likes.set(postId, before.liked);
      setCount(before.count);
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={liked ? 'secondary' : 'ghost'}
      size={size}
      aria-pressed={liked}
      aria-label={liked ? 'Bỏ thích' : 'Thích'}
      onClick={toggle}
      className={cn('tabular-nums', className)}
    >
      <Heart className={cn(liked && 'fill-rose-500 text-rose-500')} />
      {count}
    </Button>
  );
}
