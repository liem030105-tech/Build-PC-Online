/** Nhu cầu sử dụng của một build khi đăng lên cộng đồng. */
export interface PurposeMeta {
  id: string;
  label: string;
}

export const PURPOSES: PurposeMeta[] = [
  { id: 'gaming', label: 'Gaming' },
  { id: 'creator', label: 'Đồ hoạ / dựng phim' },
  { id: 'office', label: 'Văn phòng – học tập' },
  { id: 'budget', label: 'Giá rẻ' },
  { id: 'streaming', label: 'Stream' },
  { id: 'other', label: 'Khác' },
];

const BY_ID = new Map(PURPOSES.map((p) => [p.id, p]));

/** Nhãn tiếng Việt của một mã nhu cầu; mã lạ thì coi là "Khác". */
export function purposeLabel(id: string): string {
  return BY_ID.get(id)?.label ?? 'Khác';
}
