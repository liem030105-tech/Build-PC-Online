import type { Build, Category, Part } from '../data/parts';

export interface BuildCheck {
  ok: boolean;
  /** Mọi lý do chưa khởi động được: khe còn trống trước, xung đột sau. */
  errors: string[];
  /** Các loại linh kiện bắt buộc mà chưa chọn. */
  missing: Category[];
  /** Xung đột giữa các linh kiện đã chọn (khác socket, nguồn yếu...). */
  conflicts: string[];
}

/** Công suất nguồn tối thiểu cho cấu hình, đã tính dư 20%. */
export function requiredWatt(build: Build): number {
  const cpu = build.cpu?.tdp ?? 0;
  const gpu = build.gpu?.powerW ?? 0;
  return Math.ceil((cpu + gpu + 100) * 1.2);
}

const MISSING_TEXT: Record<Category, string> = {
  cpu: 'Thiếu CPU.',
  mainboard: 'Thiếu mainboard.',
  ram: 'Thiếu RAM.',
  gpu: 'Thiếu card đồ họa.',
  ssd: 'Thiếu ổ cứng SSD.',
  psu: 'Thiếu nguồn.',
  case: 'Thiếu vỏ case.',
};

export function checkBuild(build: Build): BuildCheck {
  const { cpu, mainboard, ram, gpu, ssd, psu } = build;
  const pcCase = build.case;
  const missing: Category[] = [];
  const conflicts: string[] = [];
  /** Lỗi "thiếu card đồ họa" khi CPU không có iGPU: nói rõ lý do thay cho câu chung. */
  let gpuReason: string | null = null;

  if (!cpu) missing.push('cpu');
  if (!mainboard) missing.push('mainboard');
  if (!ram) missing.push('ram');
  // Card đồ họa được phép thiếu khi CPU có đồ họa tích hợp.
  if (!gpu && !cpu?.hasIGPU) {
    missing.push('gpu');
    if (cpu) gpuReason = `Thiếu card đồ họa: ${cpu.name} không có iGPU nên máy sẽ không lên hình.`;
  }
  if (!ssd) missing.push('ssd');
  if (!psu) missing.push('psu');
  if (!pcCase) missing.push('case');

  if (cpu && mainboard && cpu.socket !== mainboard.socket) {
    conflicts.push(
      `${cpu.name} dùng socket ${cpu.socket}, không lắp được vào ${mainboard.name} (socket ${mainboard.socket}).`,
    );
  }
  if (ram && mainboard && ram.ramType !== mainboard.ramType) {
    conflicts.push(`${ram.name} là ${ram.ramType}, nhưng ${mainboard.name} chỉ nhận ${mainboard.ramType}.`);
  }
  if (mainboard && pcCase && !pcCase.supported.includes(mainboard.formFactor)) {
    conflicts.push(`${mainboard.name} cỡ ${mainboard.formFactor} không vừa vỏ ${pcCase.name}.`);
  }
  if (psu && cpu) {
    const need = requiredWatt(build);
    if (psu.watt < need) {
      conflicts.push(`Nguồn ${psu.watt}W không đủ: cấu hình này cần ít nhất ${need}W.`);
    }
  }

  const errors = [
    ...missing.map((c) => (c === 'gpu' && gpuReason ? gpuReason : MISSING_TEXT[c])),
    ...conflicts,
  ];
  return { ok: errors.length === 0, errors, missing, conflicts };
}

/**
 * Những xung đột mới xuất hiện nếu chọn `part` thay cho linh kiện cùng loại đang có.
 * Mảng rỗng nghĩa là linh kiện này lắp được với phần còn lại của build.
 */
export function partConflicts(build: Build, part: Part): string[] {
  const without: Build = { ...build };
  delete without[part.category];
  const base = new Set(checkBuild(without).conflicts);
  const withPart = { ...without, [part.category]: part } as Build;
  return checkBuild(withPart).conflicts.filter((c) => !base.has(c));
}
