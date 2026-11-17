import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CATEGORY_BY_ID, type Build } from '@/data/parts';
import { checkBuild } from '@/sim/compatibility';

/** Tóm tắt tương thích: xung đột (đỏ), còn thiếu (thông tin) hoặc đã đủ (xanh). */
export function CompatibilityPanel({ build }: { build: Build }) {
  const check = checkBuild(build);

  if (check.ok) {
    return (
      <Alert className="border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
        <CircleCheck />
        <AlertTitle>Cấu hình tương thích</AlertTitle>
        <AlertDescription className="text-emerald-800/80 dark:text-emerald-300/80">
          Mọi linh kiện lắp được với nhau và nguồn đủ công suất.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {check.conflicts.length > 0 && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
          <TriangleAlert />
          <AlertTitle>Có {check.conflicts.length} vấn đề tương thích</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {check.conflicts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {check.missing.length > 0 && (
        <Alert>
          <Info />
          <AlertTitle>Còn thiếu {check.missing.length} linh kiện</AlertTitle>
          <AlertDescription>
            {check.missing.map((c) => CATEGORY_BY_ID[c].label).join(', ')}.
            {check.missing.includes('gpu') && build.cpu && !build.cpu.hasIGPU
              ? ` ${build.cpu.name} không có đồ họa tích hợp nên bắt buộc phải có card đồ họa.`
              : ''}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
