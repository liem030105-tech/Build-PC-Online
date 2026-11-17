import { Cpu, LogOut, User } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { catalogLine, useCatalog } from '@/hooks/useCatalog';
import { useSession } from '@/hooks/useStores';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  );

function AccountMenu() {
  const { account, session } = useSession();
  const navigate = useNavigate();

  if (!account) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Đăng nhập</Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-44">
          <User />
          <span className="truncate">{account.name || account.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{account.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/builds')}>Build của tôi</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            session.logout();
            navigate('/');
          }}
        >
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout() {
  const catalog = useCatalog();
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Link to="/" className="mr-2 flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Cpu className="size-4" />
            </span>
            <span className="hidden sm:inline">Build PC Online</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Build PC
            </NavLink>
            <NavLink to="/builds" className={navClass}>
              Build của tôi
            </NavLink>
          </nav>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 lg:pb-10">
        <Outlet />
      </main>
      <footer className="border-t pb-20 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          Giá chỉ để tham khảo. {catalogLine(catalog)}
        </div>
      </footer>
    </div>
  );
}
