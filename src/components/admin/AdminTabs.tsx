import { BadgeCheck, Boxes } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
  );

/** Thanh chuyển giữa các trang quản trị. */
export function AdminTabs() {
  return (
    <nav className="-mt-2 flex gap-1 border-b" aria-label="Trang quản trị">
      <NavLink to="/admin" end className={tab}>
        <Boxes className="size-4" />
        Linh kiện
      </NavLink>
      <NavLink to="/admin/verify" className={tab}>
        <BadgeCheck className="size-4" />
        Xác minh
      </NavLink>
    </nav>
  );
}
