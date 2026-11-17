/** Tạo phần tử DOM kèm class và nội dung chữ. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `btn ${cls}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export function vnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' đ';
}

/** Khung bảng chung: tiêu đề, nút đóng, phần thân và phần chân. */
export function panelFrame(title: string, onClose: (() => void) | null) {
  const panel = el('div', 'panel');
  const head = el('div', 'panel-head');
  head.append(el('h2', 'panel-title', title));
  if (onClose) head.append(button('Đóng [Esc]', 'ghost', onClose));
  const body = el('div', 'panel-body');
  const foot = el('div', 'panel-foot');
  panel.append(head, body, foot);
  return { panel, body, foot };
}

const root = () => document.getElementById('ui')!;

/** Hiện một bảng. `modal` làm tối nền và chặn thao tác với thế giới 3D. */
export function showUi(node: HTMLElement, kind: 'modal' | 'bar' = 'modal') {
  const r = root();
  r.replaceChildren(node);
  r.className = kind;
}

export function clearUi() {
  const r = root();
  r.replaceChildren();
  r.className = '';
}
