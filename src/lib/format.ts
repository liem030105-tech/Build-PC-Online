/** Định dạng tiền VND, ví dụ 12.500.000 đ. */
export function vnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' đ';
}

/** Ngày theo kiểu Việt Nam, ví dụ 17/11/2026. */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN');
}
