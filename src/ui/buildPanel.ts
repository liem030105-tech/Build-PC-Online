import { CATEGORIES, PART_BY_ID, buildPrice, partsOf, resolveBuild, specLine, type Category } from '../data/parts';
import { checkBuild } from '../sim/compatibility';
import { store } from '../state/store';
import { button, el, panelFrame, vnd } from './dom';

/** Tab đang xem được nhớ lại giữa các lần mở bảng. */
let lastTab: Category = 'cpu';

/**
 * Màn hình ráp PC: mỗi loại linh kiện là một tab, liệt kê mọi món trong danh mục kèm giá.
 * Chọn một món là lắp vào khe của loại đó; lỗi tương thích và tổng giá cập nhật ngay.
 */
export function buildPanel(cb: { onBoot: () => void; onCloud: () => void; onClose: () => void }): HTMLElement {
  const { panel, body, foot } = panelFrame('Ráp PC', cb.onClose);
  const tabs = el('div', 'panel-tabs');
  panel.insertBefore(tabs, body);

  const render = () => {
    const build = store.state.build;

    // Tab tô xanh là loại đã chọn xong linh kiện.
    tabs.replaceChildren();
    for (const cat of CATEGORIES) {
      const cls = ['tab', cat.id === lastTab ? 'on' : '', build[cat.id] ? 'has' : ''].filter(Boolean).join(' ');
      const tab = el('button', cls, cat.label);
      tab.type = 'button';
      tab.addEventListener('click', () => {
        lastTab = cat.id;
        body.scrollTop = 0;
        render();
      });
      tabs.append(tab);
    }

    body.replaceChildren();

    // Tình trạng cấu hình nằm trên cùng để thấy ngay sau mỗi lần chọn, không phải cuộn.
    const result = checkBuild(resolveBuild(build));
    if (result.ok) {
      body.append(el('div', 'status ok', 'Cấu hình hợp lệ. Bấm "Khởi động" để bật máy.'));
    } else {
      if (result.conflicts.length > 0) {
        const status = el('div', 'status', 'Linh kiện không khớp nhau:');
        const list = el('ul');
        for (const err of result.conflicts) list.append(el('li', '', err));
        status.append(list);
        body.append(status);
      }
      if (result.missing.length > 0) {
        const labels = result.missing.map((id) => CATEGORIES.find((c) => c.id === id)!.label);
        body.append(el('p', 'need', `Còn thiếu: ${labels.join(', ')}.`));
      }
    }

    const fitted = PART_BY_ID.get(build[lastTab] ?? '');
    body.append(
      el('p', 'muted', fitted ? `Đang lắp: ${fitted.name}. Bấm "Tháo" để bỏ ra, hoặc chọn món khác để đổi.` : 'Chưa chọn món nào cho loại này.'),
    );
    for (const part of partsOf(lastTab)) {
      const on = build[lastTab] === part.id;
      const row = el('div', on ? 'item on' : 'item');
      const main = el('div', 'item-main');
      main.append(el('div', 'item-name', part.name), el('div', 'muted', specLine(part)));
      const pick = button(on ? 'Tháo' : 'Chọn', on ? 'ghost' : '', () => {
        store.setSlot(lastTab, on ? null : part.id);
        render();
      });
      row.append(main, el('div', 'item-price', vnd(part.price)), pick);
      body.append(row);
    }

    foot.replaceChildren();
    const total = el('span');
    total.append('Giá bộ máy: ', el('span', 'money', vnd(buildPrice(build))));
    const clear = button('Tháo hết', 'ghost', () => {
      store.reset();
      render();
    });
    clear.disabled = !CATEGORIES.some((c) => build[c.id]);
    const boot = button('Khởi động', 'go', cb.onBoot);
    boot.disabled = !result.ok;
    const actions = el('span', 'row');
    actions.append(clear, button('Lưu / tải build', 'ghost', cb.onCloud), boot);
    foot.append(total, actions);
  };
  render();
  return panel;
}
