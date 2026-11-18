import { ImagePlus, Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { rejectReason } from '@/lib/image';
import { cn } from '@/lib/utils';

export const MAX_IMAGES = 4;

export interface PickedImage {
  id: string;
  file: File;
  preview: string;
}

interface Props {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  disabled?: boolean;
}

/** Chọn tối đa 4 ảnh (bấm hoặc kéo-thả); ảnh đầu tiên là ảnh bìa. */
export function ImagePicker({ images, onChange, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Giải phóng URL xem trước khi gỡ component.
  const latest = useRef(images);
  latest.current = images;
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  function add(files: FileList | File[]) {
    const room = MAX_IMAGES - images.length;
    const accepted: PickedImage[] = [];
    for (const file of Array.from(files)) {
      const reason = rejectReason(file);
      if (reason) {
        toast.error(reason);
        continue;
      }
      if (accepted.length >= room) {
        toast.info(`Mỗi bài tối đa ${MAX_IMAGES} ảnh.`);
        break;
      }
      accepted.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    if (accepted.length) onChange([...images, ...accepted]);
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.preview);
    onChange(images.filter((i) => i.id !== id));
  }

  function makeCover(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) onChange([img, ...images.filter((i) => i.id !== id)]);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <img src={img.preview} alt="" className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Ảnh bìa
              </span>
            )}
            {!disabled && (
              <div className="absolute top-1 right-1 flex gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    className="rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    aria-label="Đặt làm ảnh bìa"
                    title="Đặt làm ảnh bìa"
                    onClick={() => makeCover(img.id)}
                  >
                    <Star className="size-3" />
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full bg-black/70 p-1 text-white hover:bg-black"
                  aria-label="Bỏ ảnh"
                  onClick={() => remove(img.id)}
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              add(e.dataTransfer.files);
            }}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50',
              dragging && 'border-foreground bg-muted',
            )}
          >
            <ImagePlus className="size-5" />
            Thêm ảnh
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tối đa {MAX_IMAGES} ảnh, mỗi ảnh ≤ 10 MB. Ảnh được thu nhỏ trước khi tải lên.
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) add(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
