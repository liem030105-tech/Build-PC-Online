import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { PostComment } from '@/net/xano';

interface Props {
  postId: number;
  /** Chủ bài được xoá mọi bình luận trong bài của mình. */
  postOwnerId: number;
  comments: PostComment[];
  onChange: (comments: PostComment[]) => void;
}

const MAX = 1000;

export function CommentSection({ postId, postOwnerId, comments, onChange }: Props) {
  const { account, session } = useSession();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSending(true);
    try {
      const comment = await session.client.addComment(postId, text);
      onChange([...comments, comment]);
      setContent('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function remove(c: PostComment) {
    try {
      await session.client.deleteComment(c.id);
      onChange(comments.filter((x) => x.id !== c.id));
      toast.success('Đã xoá bình luận');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bình luận ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">Chưa có bình luận nào.</p>}
        {comments.length > 0 && (
          <ul className="space-y-4">
            {comments.map((c) => {
              const canDelete = account && (account.id === c.user_id || account.id === postOwnerId);
              return (
                <li key={c.id} className="group flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                    {(c.author_name || '?').slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{c.author_name || 'Ẩn danh'}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto size-7 text-muted-foreground"
                          aria-label="Xoá bình luận"
                          onClick={() => void remove(c)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm break-words whitespace-pre-line">{c.content}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {account ? (
          <form onSubmit={submit} className="space-y-2">
            <Textarea
              placeholder="Góp ý cho cấu hình này…"
              maxLength={MAX}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Nội dung bình luận"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground tabular-nums">
                {content.length}/{MAX}
              </span>
              <Button type="submit" size="sm" disabled={sending || !content.trim()}>
                {sending ? 'Đang gửi…' : 'Gửi bình luận'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Đăng nhập
            </Link>{' '}
            để bình luận.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
