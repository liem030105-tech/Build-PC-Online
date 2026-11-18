import { ArrowLeft, Copy, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CompatibilityPanel } from '@/components/builder/CompatibilityPanel';
import { FpsCard } from '@/components/builder/FpsCard';
import { PartTable } from '@/components/builder/PartTable';
import { CommentSection } from '@/components/posts/CommentSection';
import { LikeButton } from '@/components/posts/LikeButton';
import { PostGallery } from '@/components/posts/PostGallery';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildPrice, resolveBuild } from '@/data/parts';
import { purposeLabel } from '@/data/purposes';
import { useSession } from '@/hooks/useStores';
import { copyText } from '@/lib/clipboard';
import { errorMessage } from '@/lib/errors';
import { formatDate, vnd } from '@/lib/format';
import type { PostDetail } from '@/net/xano';
import { sanitize, store } from '@/state/store';

export default function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const { account, session } = useSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(postId) || postId < 1) {
      setError('Link bài đăng không hợp lệ.');
      return;
    }
    let cancelled = false;
    setPost(null);
    setError(null);
    session.client.getPost(postId).then(
      (p) => !cancelled && setPost(p),
      (err) => !cancelled && setError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [postId, session]);

  // Linh kiện không còn trong danh mục thì bỏ qua khi hiển thị.
  const { build: ids, dropped } = useMemo(() => sanitize(post?.parts), [post]);
  const build = useMemo(() => resolveBuild(ids), [ids]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không mở được bài đăng</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/posts">
            <ArrowLeft />
            Về trang Cộng đồng
          </Link>
        </Button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const isOwner = account?.id === post.user_id;
  const currentPrice = buildPrice(ids);

  function edit() {
    store.loadBuild(ids);
    toast.info('Đã nạp cấu hình vào trang Build PC.');
    navigate('/');
  }

  async function remove() {
    try {
      await session.client.deletePost(postId);
      toast.success('Đã xoá bài đăng');
      navigate('/posts');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Cộng đồng
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{purposeLabel(post.purpose)}</Badge>
          <span>
            {post.author_name || 'Ẩn danh'} · {formatDate(post.created_at)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{post.title}</h1>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{vnd(post.total_price)}</div>
          {currentPrice !== post.total_price && currentPrice > 0 && (
            <p className="text-xs text-muted-foreground">Giá hiện tại theo danh mục: {vnd(currentPrice)}</p>
          )}
          {dropped > 0 && (
            <p className="text-xs text-muted-foreground">
              {dropped} linh kiện không còn trong danh mục nên không hiển thị.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LikeButton postId={post.id} count={post.like_count} size="default" className="border" />
          <Button onClick={edit}>
            <Pencil />
            Sửa build này
          </Button>
          <Button variant="outline" onClick={() => copyText(window.location.href)}>
            <Copy />
            Sao chép link
          </Button>
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground">
                  <Trash2 />
                  Xoá bài
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xoá bài đăng này?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bài đăng cùng toàn bộ lượt thích và bình luận sẽ bị xoá, không khôi phục được.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => void remove()}>
                    Xoá
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {post.description && (
          <p className="max-w-3xl text-sm leading-relaxed break-words whitespace-pre-line">{post.description}</p>
        )}
      </div>

      <PostGallery urls={post.images.map((p) => session.client.mediaUrl(p))} title={post.title} />

      <CompatibilityPanel build={build} />
      <PartTable build={build} />
      <FpsCard build={build} />
      <CommentSection
        postId={post.id}
        postOwnerId={post.user_id}
        comments={post.comments}
        onChange={(comments) => setPost({ ...post, comments, comment_count: comments.length })}
      />
    </div>
  );
}
