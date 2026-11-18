import { BuildSummary, ResetBuildButton } from '@/components/builder/BuildSummary';
import { CompatibilityPanel } from '@/components/builder/CompatibilityPanel';
import { FpsCard } from '@/components/builder/FpsCard';
import { PartTable } from '@/components/builder/PartTable';
import { useBuild } from '@/hooks/useStores';

export default function BuilderPage() {
  const { ids, build, store } = useBuild();
  const empty = Object.keys(ids).length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Build PC</h1>
            <p className="text-sm text-muted-foreground">
              Chọn từng linh kiện, hệ thống tự kiểm tra tương thích và ước tính hiệu năng.
            </p>
          </div>
          <ResetBuildButton className="lg:hidden" disabled={empty} onReset={() => store.reset()} />
        </div>
        <CompatibilityPanel build={build} />
        <PartTable build={build} actions={store} />
        <FpsCard build={build} />
      </div>
      <BuildSummary ids={ids} build={build} onReset={() => store.reset()} />
    </div>
  );
}
