import { toast } from 'sonner';

/** Sao chép văn bản và báo kết quả bằng toast. */
export async function copyText(text: string, success = 'Đã sao chép link'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch {
    // Trình duyệt chặn clipboard (không phải HTTPS, hoặc bị từ chối): cho người dùng tự chép.
    window.prompt('Sao chép link này:', text);
  }
}
