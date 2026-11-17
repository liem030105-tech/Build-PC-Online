import type { CatalogStatus } from '../state/catalog';
import { button, el, panelFrame } from './dom';

function catalogLine(c: CatalogStatus): string {
  const skipped = c.skipped > 0 ? ` (bỏ qua ${c.skipped} dòng nhập thiếu thông số)` : '';
  if (c.source === 'server') return `Danh mục có ${c.count} linh kiện, tải từ máy chủ${skipped}.`;
  if (c.source === 'cache') return `Không kết nối được máy chủ: dùng ${c.count} linh kiện đã tải lần trước.`;
  return `Không kết nối được máy chủ: dùng ${c.count} linh kiện đi kèm trò chơi.`;
}

/** Màn hình hướng dẫn hiện lúc mở trò chơi. */
export function introPanel(hasSave: boolean, catalog: CatalogStatus, onStart: () => void): HTMLElement {
  const { panel, body, foot } = panelFrame('Build PC Online', null);
  const steps = el('ol', 'howto');
  for (const step of [
    'Đi tới bàn máy tính và bấm E để mở "Ráp PC".',
    'Chọn linh kiện cho từng loại qua các tab. Mỗi món có giá riêng, và linh kiện phải khớp nhau.',
    'Khởi động máy, chọn game và xem FPS trên màn hình.',
  ]) {
    steps.append(el('li', '', step));
  }
  const keys = el('div', 'keys');
  for (const [key, what] of [['WASD', 'đi lại'], ['Kéo chuột', 'xoay camera'], ['E', 'tương tác'], ['L', 'lưu build'], ['Esc', 'đóng bảng']]) {
    keys.append(el('kbd', '', key), `${what}   `);
  }
  body.append(steps, keys, el('p', 'muted', catalogLine(catalog)));
  foot.append(
    el('span', 'muted', hasSave ? 'Đã tải tiến trình lần trước.' : ''),
    button(hasSave ? 'Chơi tiếp' : 'Bắt đầu', 'go', onStart),
  );
  return panel;
}
