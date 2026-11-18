import { BadgeCheck, TriangleAlert } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
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
import { shrinkImage } from '@/lib/image';
import { ImagePicker, type PickedImage } from './ImagePicker';
import { checkBuild } from '@/sim/compatibility';

interface Props {
  ids: BuildIds;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên gợi ý cho tiêu đề, ví dụ tên build đã lưu. */
  defaultTitle?: string;
  /** Đăng từ build đã lưu: gắn bài với build đó (để kế thừa trạng thái xác minh). */
  buildId?: number;
  /** Build đã lưu này đã được admin xác minh. */
  verified?: boolean;
}

const MAX_DESC = 2000;

/** Đăng một build lên trang Cộng đồng. Chỉ cho đăng build đủ linh kiện và tương thích. */
export function PublishPostDialog({ ids, open, onOpenChange, defaultTitle = '', buildId, verified }: Props) {
  const { account, session, configured } = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState(defaultTitle);
  const [purpose, setPurpose] = useState('gaming');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  // Ảnh đã tải xong thì nhớ đường dẫn, để bấm Đăng lại sau khi lỗi không phải tải lại.
  const uploaded = useRef(new Map<string, string>());

  const check = checkBuild(resolveBuild(ids));
  const total = buildPrice(ids);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const paths: string[] = [];
      for (const [i, img] of images.entries()) {
        let path = uploaded.current.get(img.id);
        if (!path) {
          setProgress(`Đang tải ảnh ${i + 1}/${images.length}…`);
          path = await session.client.uploadImage(await shrinkImage(img.file), img.file.name.replace(/\.\w+$/, '.jpg'));
          uploaded.current.set(img.id, path);
        }
        paths.push(path);
      }
      setProgress('Đang đăng…');
      const post = await session.client.createPost({
        title: title.trim(),
        description: description.trim(),
        purpose,
        parts: ids,
        totalPrice: total,
        images: paths,
        buildId,
      });
      toast.success('Đã đăng lên cộng đồng');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      setImages([]);
      uploaded.current.clear();
      navigate(`/posts/${post.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
      setProgress(null);
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đăng lên cộng đồng</DialogTitle>
          <DialogDescription>
            Mọi người đều xem được bài đăng, kể cả khi chưa đăng nhập. Tổng giá: {vnd(total)}.
          </DialogDescription>
          {verified && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="size-4" />
              Build đã xác minh: bài đăng sẽ có huy hiệu và video thực tế.
            </p>
          )}
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
            <div className="space-y-2">
              <Label>Ảnh máy (không bắt buộc)</Label>
              <ImagePicker images={images} onChange={setImages} disabled={sending} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={sending || title.trim().length < 3}>
                {sending ? (progress ?? 'Đang đăng…') : 'Đăng bài'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
