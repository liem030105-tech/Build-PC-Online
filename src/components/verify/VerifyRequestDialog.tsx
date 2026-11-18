import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { GAMES } from '@/data/games';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { VIDEO_HINT, parseVideo } from '@/lib/video';
import type { SavedBuild } from '@/net/xano';

const OTHER = '__other';
const MAX_VIDEOS = 4;

interface Row {
  key: number;
  /** Tên game trong GAMES, hoặc OTHER để tự gõ. */
  game: string;
  custom: string;
  url: string;
}

let nextKey = 1;
const newRow = (game = GAMES[0].name): Row => ({ key: nextKey++, game, custom: '', url: '' });

interface Props {
  build: SavedBuild | null;
  onOpenChange: (open: boolean) => void;
  /** Gửi xong: báo để trang cập nhật trạng thái build. */
  onSubmitted: (buildId: number) => void;
}

/** Form gửi yêu cầu xác minh cho build đã lưu: 1–4 video chơi game trên máy đó. */
export function VerifyRequestDialog({ build, onOpenChange, onSubmitted }: Props) {
  return (
    <Dialog open={build !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {build && <Body key={build.id} build={build} onClose={() => onOpenChange(false)} onSubmitted={onSubmitted} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ build, onClose, onSubmitted }: { build: SavedBuild; onClose: () => void; onSubmitted: (id: number) => void }) {
  const { session } = useSession();
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const videos = rows.map((r) => ({ game: (r.game === OTHER ? r.custom : r.game).trim(), url: r.url.trim() }));
    const bad = videos.findIndex((v) => !v.game || !parseVideo(v.url));
    if (bad >= 0) {
      setError(!videos[bad].game ? `Video ${bad + 1}: nhập tên game.` : `Video ${bad + 1}: ${VIDEO_HINT}`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await session.client.requestVerification(build.id, videos, note.trim());
      toast.success('Đã gửi yêu cầu xác minh. Admin sẽ xem video và duyệt.');
      onSubmitted(build.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Xác minh “{build.name || 'Build không tên'}”</DialogTitle>
        <DialogDescription>
          Gửi link video quay các game chơi trên máy này (nên thấy rõ máy và FPS). Admin xem xong sẽ duyệt hoặc báo lý do
          để bạn gửi lại.
        </DialogDescription>
      </DialogHeader>

      {build.verify_status === 'rejected' && build.verify_reason && (
        <Alert>
          <TriangleAlert />
          <AlertDescription>Lần trước bị từ chối: {build.verify_reason}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.key} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Video {i + 1}</Label>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Bỏ video ${i + 1}`}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <Select value={r.game} onValueChange={(v) => update(r.key, { game: v })}>
                <SelectTrigger className="w-full" aria-label={`Game của video ${i + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAMES.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Game khác…</SelectItem>
                </SelectContent>
              </Select>
              {r.game === OTHER ? (
                <Input
                  required
                  maxLength={40}
                  placeholder="Tên game"
                  value={r.custom}
                  onChange={(e) => update(r.key, { custom: e.target.value })}
                />
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
            <Input
              required
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/…"
              value={r.url}
              onChange={(e) => update(r.key, { url: e.target.value })}
              aria-label={`Link video ${i + 1}`}
              aria-invalid={r.url.trim() !== '' && !parseVideo(r.url)}
            />
          </div>
        ))}
        {rows.length < MAX_VIDEOS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const used = new Set(rows.map((r) => r.game));
              setRows((rs) => [...rs, newRow(GAMES.find((g) => !used.has(g.name))?.name ?? OTHER)]);
            }}
          >
            <Plus />
            Thêm video
          </Button>
        )}
        <p className="text-xs text-muted-foreground">{VIDEO_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify-note">Ghi chú cho admin (không bắt buộc)</Label>
        <Textarea
          id="verify-note"
          rows={3}
          maxLength={500}
          placeholder="Thiết lập đồ hoạ, độ phân giải, phút có hiện FPS…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </Button>
      </DialogFooter>
    </form>
  );
}
