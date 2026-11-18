import {
  CircuitBoard,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  HardDriveDownload,
  MemoryStick,
  Monitor,
  PcCase,
  Snowflake,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/data/parts';

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  cpu: Cpu,
  mainboard: CircuitBoard,
  ram: MemoryStick,
  gpu: Gpu,
  ssd: HardDrive,
  psu: Zap,
  case: PcCase,
  cooler: Snowflake,
  drive: HardDriveDownload,
  fan: Fan,
  monitor: Monitor,
};
