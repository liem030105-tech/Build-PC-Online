import { TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { buildPrice, resolveBuild, type BuildIds } from '@/data/parts';
import { PURPOSES } from '@/data/purposes';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { vnd } from '@/lib/format';
import { checkBuild } from '@/sim/compatibility';

interface Props {
  ids: BuildIds;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên gợi ý cho tiêu đề, ví dụ tên build đã lưu. */
  defaultTitle?: string;
}

const MAX_DESC = 2000;

/** Đăng một build lên trang Cộng đồng. Chỉ cho đăng build đủ linh kiện và tương thích. */
export function PublishPostDialog({ ids, open, onOpenChange, defaultTitle = '' }: Props) {
  const { account, session, configured } = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState(defaultTitle);
  const [purpose, setPurpose] = useState('gaming');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const check = checkBuild(resolveBuild(ids));
  const total = buildPrice(ids);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const post = await session.client.createPost({
        title: title.trim(),
        description: description.trim(),
        purpose,
        parts: ids,
        totalPrice: total,
      });
      toast.success('Đã đăng lên cộng đồng');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      navigate(`/posts/${post.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o && !title) setTitle(defaultTitle);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đăng lên cộng đồng</DialogTitle>
          <DialogDescription>
            Mọi người đều xem được bài đăng, kể cả khi chưa đăng nhập. Tổng giá: {vnd(total)}.
          </DialogDescription>
        </DialogHeader>

        {!configured ? (
          <p className="text-sm text-muted-foreground">Chưa cấu hình máy chủ nên chưa đăng bài được.</p>
        ) : !account ? (
          <>
            <p className="text-sm text-muted-foreground">Đăng nhập để đăng build lên cộng đồng.</p>
            <DialogFooter>
              <Button variant="outline" asChild>
                <Link to="/signup" onClick={close}>
                  Tạo tài khoản
                </Link>
              </Button>
              <Button asChild>
                <Link to="/login" onClick={close}>
                  Đăng nhập
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : !check.ok ? (
          <Alert>
            <TriangleAlert />
            <AlertTitle>Build chưa hoàn chỉnh</AlertTitle>
            <AlertDescription>
              <p>Chỉ đăng được build đủ linh kiện và tương thích. Cần xử lý:</p>
              <ul className="mt-1 list-disc pl-4">
                {check.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Tiêu đề</Label>
              <Input
                id="post-title"
                autoFocus
                required
                minLength={3}
                maxLength={120}
                placeholder="Ví dụ: PC chơi game 1080p tầm 20 triệu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-purpose">Nhu cầu</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="post-purpose" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-desc">Mô tả</Label>
              <Textarea
                id="post-desc"
                rows={5}
                maxLength={MAX_DESC}
                placeholder="Bạn dùng máy để làm gì, vì sao chọn các linh kiện này, có gì muốn hỏi…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {description.length}/{MAX_DESC}
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={sending || title.trim().length < 3}>
                {sending ? 'Đang đăng…' : 'Đăng bài'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
