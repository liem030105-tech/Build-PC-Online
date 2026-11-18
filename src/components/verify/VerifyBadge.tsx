import { BadgeCheck, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { VerifyStatus } from '@/net/xano';
import { cn } from '@/lib/utils';

const STYLE: Record<Exclude<VerifyStatus, 'none'>, { label: string; className: string; Icon: typeof BadgeCheck }> = {
  approved: {
    label: 'Đã xác minh',
    className: 'border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    Icon: BadgeCheck,
  },
  pending: {
    label: 'Đang chờ duyệt',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200',
    Icon: Clock,
  },
  rejected: {
    label: 'Bị từ chối',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    Icon: XCircle,
  },
};

/** Huy hiệu trạng thái xác minh; `none` thì không hiện gì. */
export function VerifyBadge({ status, className }: { status: VerifyStatus; className?: string }) {
  if (status === 'none') return null;
  const { label, className: tone, Icon } = STYLE[status];
  return (
    <Badge variant="outline" className={cn('gap-1', tone, className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
