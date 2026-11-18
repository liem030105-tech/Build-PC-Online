import { TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { rowToPart, type PartRow } from '@/data/catalog';
import { CATEGORY_BY_ID, type Category } from '@/data/parts';
import { ALL_SPEC_KEYS, PART_FIELDS, suggestKey } from './partFields';

type Values = Record<string, string | boolean>;

interface Props {
  category: Category;
  /** Dòng đang sửa (null = thêm mới). */
  row: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (row: PartRow) => Promise<void>;
}

function initialValues(row: Record<string, unknown> | null): Values {
  const v: Values = {};
  for (const key of ['key', 'name', 'price', ...ALL_SPEC_KEYS]) {
    const raw = row?.[key];
    v[key] = typeof raw === 'boolean' ? raw : raw == null ? '' : String(raw);
  }
  return v;
}

/** Đổi giá trị trong form thành dòng `part`: số thành number, ô trống thành null. */
function toRow(category: Category, v: Values): PartRow {
  const row: Record<string, unknown> = {
    key: String(v.key).trim().toLowerCase(),
    category,
    name: String(v.name).trim(),
    price: Number(v.price) || 0,
  };
  for (const key of ALL_SPEC_KEYS) row[key] = null;
  for (const f of PART_FIELDS[category]) {
    const raw = v[f.key];
    if (f.type === 'bool') row[f.key] = raw === true;
    else if (f.type === 'number') row[f.key] = raw === '' ? null : Number(raw);
    else row[f.key] = String(raw ?? '').trim() || null;
  }
  return row as unknown as PartRow;
}

/** Hộp thoại thêm/sửa linh kiện; các ô nhập đổi theo loại linh kiện. */
export function PartFormDialog({ category, row, open, onOpenChange, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-lg">
        {open && (
          <FormBody
            key={`${category}-${String(row?.id ?? 'new')}`}
            category={category}
            row={row}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  category,
  row,
  onCancel,
  onSubmit,
}: {
  category: Category;
  row: Record<string, unknown> | null;
  onCancel: () => void;
  onSubmit: (row: PartRow) => Promise<void>;
}) {
  const [values, setValues] = useState<Values>(() => initialValues(row));
  const [keyTouched, setKeyTouched] = useState(!!row);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!row;
  const label = CATEGORY_BY_ID[category].label;

  const set = (key: string, value: string | boolean) =>
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Gợi ý mã theo tên khi thêm mới, cho tới khi người dùng tự sửa ô mã.
      if (key === 'name' && !keyTouched) next.key = suggestKey(category, String(value));
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = toRow(category, values);
    // Kiểm tra bằng đúng hàm web dùng để đọc danh mục, để dòng lưu lên luôn dùng được.
    if (!rowToPart(out)) {
      setError('Còn thiếu hoặc sai thông số bắt buộc của loại linh kiện này. Kiểm tra lại các ô có số liệu.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? `Sửa ${label}` : `Thêm ${label}`}</DialogTitle>
        <DialogDescription>
          {editing ? 'Mã linh kiện không đổi được vì build đã lưu đang dùng mã này.' : 'Mã được gợi ý theo tên, có thể sửa.'}
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1 grid min-h-0 gap-3 overflow-y-auto px-1 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="f-name">Tên</Label>
          <Input id="f-name" required value={String(values.name)} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-key">Mã</Label>
          <Input
            id="f-key"
            required
            disabled={editing}
            pattern="[a-z0-9\-]+"
            title="Chữ thường, số và dấu gạch ngang"
            value={String(values.key)}
            onChange={(e) => {
              setKeyTouched(true);
              set('key', e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-price">Giá (đ)</Label>
          <Input
            id="f-price"
            required
            type="number"
            min={0}
            step={1000}
            value={String(values.price)}
            onChange={(e) => set('price', e.target.value)}
          />
        </div>

        {PART_FIELDS[category].map((f) => (
          <div key={f.key} className={f.type === 'bool' ? 'flex items-center gap-2 sm:col-span-2' : 'space-y-1.5'}>
            {f.type === 'bool' ? (
              <>
                <Switch id={`f-${f.key}`} checked={values[f.key] === true} onCheckedChange={(c) => set(f.key, c)} />
                <Label htmlFor={`f-${f.key}`} className="font-normal">
                  {f.label}
                </Label>
              </>
            ) : (
              <>
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                {f.type === 'select' ? (
                  <Select value={String(values[f.key] || '')} onValueChange={(v) => set(f.key, v)}>
                    <SelectTrigger id={`f-${f.key}`} className="w-full">
                      <SelectValue placeholder="Chọn…" />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options!.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`f-${f.key}`}
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.type === 'number' ? 0 : undefined}
                    placeholder={f.placeholder}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm linh kiện'}
        </Button>
      </DialogFooter>
    </form>
  );
}
