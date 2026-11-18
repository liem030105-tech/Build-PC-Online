import { CircleCheck, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CATEGORY_BY_ID, type Build } from '@/data/parts';
import { checkBuild } from '@/sim/compatibility';

/** Tóm tắt tương thích: xung đột (đỏ), còn thiếu (thông tin), lời khuyên (vàng) hoặc đã đủ (xanh). */
export function CompatibilityPanel({ build }: { build: Build }) {
  const check = checkBuild(build);

  const warnings = check.warnings.length > 0 && (
    <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
      <Lightbulb />
      <AlertTitle>Lời khuyên</AlertTitle>
      <AlertDescription className="text-amber-900/80 dark:text-amber-200/80">
        <ul className="list-disc space-y-0.5 pl-4">
          {check.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );

  if (check.ok) {
    return (
      <div className="space-y-3">
        <Alert className="border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CircleCheck />
          <AlertTitle>Cấu hình tương thích</AlertTitle>
          <AlertDescription className="text-emerald-800/80 dark:text-emerald-300/80">
            Mọi linh kiện lắp được với nhau và nguồn đủ công suất.
          </AlertDescription>
        </Alert>
        {warnings}
      </div>
    );
  }

  // Câu báo thiếu cụ thể (thiếu card vì CPU không có iGPU, thiếu tản vì CPU không kèm quạt).
  const details = check.errors.filter((e) => e.includes(': '));

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
            <p>{check.missing.map((c) => CATEGORY_BY_ID[c].label).join(', ')}.</p>
            {details.map((d) => (
              <p key={d}>{d.slice(d.indexOf(': ') + 2)}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
      {warnings}
    </div>
  );
}
