import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="text-5xl font-semibold text-muted-foreground/40">404</div>
      <h1 className="mt-3 text-xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-1 text-sm text-muted-foreground">Link có thể đã sai hoặc trang không còn nữa.</p>
      <Button asChild className="mt-6">
        <Link to="/">Về trang Build PC</Link>
      </Button>
    </div>
  );
}
