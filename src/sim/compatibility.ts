import { MAX_DRIVES, type Build, type Category, type Part } from '../data/parts';

export interface BuildCheck {
  ok: boolean;
  /** Mọi lý do chưa lắp được: khe còn trống trước, xung đột sau. */
  errors: string[];
  /** Các loại linh kiện bắt buộc mà chưa chọn. */
  missing: Category[];
  /** Xung đột giữa các linh kiện đã chọn (khác socket, nguồn yếu...). */
  conflicts: string[];
  /** Lời khuyên, không chặn việc lắp ráp. */
  warnings: string[];
}

/** Công suất nguồn tối thiểu cho cấu hình, đã tính dư 20%. */
export function requiredWatt(build: Build): number {
  const cpu = build.cpu?.tdp ?? 0;
  const gpu = build.gpu?.powerW ?? 0;
  const drives = (build.drive ?? []).reduce((s, d) => s + d.powerW, 0);
  const fans = build.fan ? build.fan.part.powerW * build.fan.qty : 0;
  return Math.ceil((cpu + gpu + drives + fans + 100) * 1.2);
}

const MISSING_TEXT: Record<Category, string> = {
  cpu: 'Thiếu CPU.',
  mainboard: 'Thiếu mainboard.',
  ram: 'Thiếu RAM.',
  gpu: 'Thiếu card đồ họa.',
  ssd: 'Thiếu ổ cứng SSD.',
  psu: 'Thiếu nguồn.',
  case: 'Thiếu vỏ case.',
  cooler: 'Thiếu tản nhiệt CPU.',
  drive: '',
  fan: '',
  monitor: '',
};

export function checkBuild(build: Build): BuildCheck {
  const { cpu, mainboard, ram, gpu, ssd, psu, cooler, fan } = build;
  const pcCase = build.case;
  const missing: Category[] = [];
  const conflicts: string[] = [];
  const warnings: string[] = [];
  /** Câu báo thiếu cụ thể hơn câu chung, nếu có. */
  const reason: Partial<Record<Category, string>> = {};

  if (!cpu) missing.push('cpu');
  if (!mainboard) missing.push('mainboard');
  if (!ram) missing.push('ram');
  // Card đồ họa được phép thiếu khi CPU có đồ họa tích hợp.
  if (!gpu && !cpu?.hasIGPU) {
    missing.push('gpu');
    if (cpu) reason.gpu = `Thiếu card đồ họa: ${cpu.name} không có iGPU nên máy sẽ không lên hình.`;
  }
  if (!ssd) missing.push('ssd');
  if (!psu) missing.push('psu');
  if (!pcCase) missing.push('case');
  // Tản nhiệt chỉ bắt buộc khi CPU không kèm quạt trong hộp.
  if (cpu && !cpu.boxCooler && !cooler) {
    missing.push('cooler');
    reason.cooler = `Thiếu tản nhiệt CPU: ${cpu.name} không kèm quạt trong hộp.`;
  }

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

  if (cooler && cpu) {
    if (!cooler.sockets.includes(cpu.socket)) {
      conflicts.push(`${cooler.name} không hỗ trợ socket ${cpu.socket} của ${cpu.name}.`);
    }
    if (cooler.maxTdp < cpu.tdp) {
      conflicts.push(`${cooler.name} chỉ tản được ${cooler.maxTdp}W, không đủ cho ${cpu.name} (${cpu.tdp}W).`);
    }
  }
  if (cooler && pcCase) {
    if (cooler.coolerType === 'air' && pcCase.maxCoolerMm && cooler.heightMm > pcCase.maxCoolerMm) {
      conflicts.push(
        `${cooler.name} cao ${cooler.heightMm}mm, vượt chiều cao tản tối đa ${pcCase.maxCoolerMm}mm của ${pcCase.name}.`,
      );
    }
    if (cooler.coolerType === 'aio' && pcCase.radiators && !pcCase.radiators.includes(cooler.radiatorMm)) {
      const fits = pcCase.radiators.length ? `chỉ lắp được rad ${pcCase.radiators.join('/')}mm` : 'không lắp được tản nước';
      conflicts.push(`${pcCase.name} ${fits}, không vừa rad ${cooler.radiatorMm}mm của ${cooler.name}.`);
    }
  }
  if (fan && pcCase?.fanSlots && fan.qty > pcCase.fanSlots) {
    conflicts.push(`${pcCase.name} chỉ có ${pcCase.fanSlots} vị trí quạt, không lắp đủ ${fan.qty} quạt.`);
  }
  if ((build.drive?.length ?? 0) > MAX_DRIVES) {
    conflicts.push(`Chỉ chọn tối đa ${MAX_DRIVES} ổ cứng thêm.`);
  }

  if (psu && cpu) {
    const need = requiredWatt(build);
    if (psu.watt < need) {
      conflicts.push(`Nguồn ${psu.watt}W không đủ: cấu hình này cần ít nhất ${need}W.`);
    } else if (need > psu.watt * 0.9) {
      warnings.push(`Nguồn ${psu.watt}W khá sát mức cần (${need}W); nên chọn nguồn dư hơn để bền và êm.`);
    }
  }

  const errors = [...missing.map((c) => reason[c] ?? MISSING_TEXT[c]), ...conflicts];
  return { ok: errors.length === 0, errors, missing, conflicts, warnings };
}

/** Build sau khi thêm hoặc thay `part`: ổ cứng thêm thì nối vào, quạt thì giữ số lượng đang có. */
export function withPart(build: Build, part: Part): Build {
  if (part.category === 'drive') return { ...build, drive: [...(build.drive ?? []), part] };
  if (part.category === 'fan') return { ...build, fan: { part, qty: build.fan?.qty ?? 1 } };
  return { ...build, [part.category]: part };
}

/**
 * Những xung đột mới xuất hiện nếu chọn `part` thay cho linh kiện cùng loại đang có.
 * Mảng rỗng nghĩa là linh kiện này lắp được với phần còn lại của build.
 */
export function partConflicts(build: Build, part: Part): string[] {
  const without: Build = { ...build };
  if (part.category === 'drive') {
    // Ổ đang có trong build thì bỏ chính nó ra trước, để không bị tính hai lần.
    const i = build.drive?.indexOf(part) ?? -1;
    if (i >= 0) without.drive = build.drive!.filter((_, j) => j !== i);
  } else delete without[part.category];
  const base = new Set(checkBuild(without).conflicts);
  return checkBuild(withPart(without, part)).conflicts.filter((c) => !base.has(c));
}
