import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
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
import { buildPrice, type BuildIds } from '@/data/parts';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

interface Props {
  ids: BuildIds;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveBuildDialog({ ids, open, onOpenChange }: Props) {
  const { account, session, configured } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const title = name.trim() || `Build ngày ${formatDate(Date.now())}`;
      await session.client.saveBuild(title, ids, buildPrice(ids));
      toast.success(`Đã lưu “${title}”`);
      setName('');
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu build</DialogTitle>
          <DialogDescription>
            {!configured
              ? 'Chưa cấu hình máy chủ nên chưa lưu online được. Bạn vẫn có thể chia sẻ build qua link.'
              : account
                ? 'Build được lưu vào tài khoản để mở lại trên mọi thiết bị.'
                : 'Đăng nhập để lưu build vào tài khoản của bạn.'}
          </DialogDescription>
        </DialogHeader>

        {configured && account && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="build-name">Tên build</Label>
              <Input
                id="build-name"
                autoFocus
                maxLength={80}
                placeholder="Ví dụ: PC chơi game 20 triệu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {configured && !account && (
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link to="/signup" onClick={() => onOpenChange(false)}>
                Tạo tài khoản
              </Link>
            </Button>
            <Button asChild>
              <Link to="/login" onClick={() => onOpenChange(false)}>
                Đăng nhập
              </Link>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
