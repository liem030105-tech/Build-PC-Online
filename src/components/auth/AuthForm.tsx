import { TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/hooks/useStores';
import { errorMessage } from '@/lib/errors';

/** Form đăng nhập hoặc đăng ký; xong thì về trang "Build của tôi". */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { account, session, configured } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  if (account) return <Navigate to="/builds" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (signup) await session.signup(name.trim(), email.trim(), password);
      else await session.login(email.trim(), password);
      navigate('/builds');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{signup ? 'Tạo tài khoản' : 'Đăng nhập'}</CardTitle>
          <CardDescription>
            {signup ? 'Lưu các cấu hình PC và mở lại trên mọi thiết bị.' : 'Đăng nhập để xem các build đã lưu.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            {!configured && (
              <Alert>
                <TriangleAlert />
                <AlertTitle>Chưa cấu hình máy chủ</AlertTitle>
                <AlertDescription>
                  Điền VITE_XANO_API_URL trong file .env.local rồi chạy lại web để bật tài khoản.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {signup && (
              <div className="space-y-2">
                <Label htmlFor="name">Tên</Label>
                <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={signup ? 8 : undefined}
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {signup && <p className="text-xs text-muted-foreground">Ít nhất 8 ký tự.</p>}
            </div>
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={busy || !configured}>
              {busy ? 'Đang xử lý…' : signup ? 'Tạo tài khoản' : 'Đăng nhập'}
            </Button>
            <p className="text-sm text-muted-foreground">
              {signup ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <Link to={signup ? '/login' : '/signup'} className="font-medium text-foreground underline underline-offset-4">
                {signup ? 'Đăng nhập' : 'Đăng ký'}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
