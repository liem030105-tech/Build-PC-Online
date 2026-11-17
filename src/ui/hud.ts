import { el, vnd } from './dom';

/** Thông tin luôn hiện trên màn hình: tên phòng, mục tiêu, giá bộ máy, tài khoản, gợi ý phím. */
export class Hud {
  private area = el('div', 'hud-area');
  private goal = el('div', 'hud-goal');
  private money = el('div', 'hud-money');
  private parts = el('div', 'muted');
  private account = el('div', 'muted');
  private prompt = el('div', 'hud-box hud-prompt hidden');
  private promptText = '';

  constructor(private root: HTMLElement) {
    const left = el('div', 'hud-box hud-top-left');
    left.append(this.area, this.goal);
    const right = el('div', 'hud-box hud-top-right');
    right.append(this.money, this.parts, this.account);
    const keys = el('div', 'hud-box hud-keys');
    for (const [key, what] of [['WASD', 'đi'], ['Kéo chuột', 'xoay'], ['E', 'tương tác'], ['L', 'lưu build']]) {
      keys.append(el('kbd', '', key), `${what}  `);
    }
    root.append(left, right, keys, this.prompt);
  }

  /** Ẩn cả HUD khi zoom vào màn hình PC để không che bộ đếm FPS. */
  setVisible(visible: boolean) {
    this.root.classList.toggle('hidden', !visible);
  }

  setArea(title: string) {
    this.area.textContent = title;
  }

  setGoal(text: string) {
    this.goal.textContent = text;
  }

  /** Tổng giá cấu hình đang ráp và số khe đã có linh kiện. */
  setBuild(price: number, fitted: number, slots: number) {
    this.money.replaceChildren('Giá bộ máy: ', el('b', '', vnd(price)));
    this.parts.textContent = `Đã chọn: ${fitted}/${slots} linh kiện`;
  }

  /** Tên tài khoản đang đăng nhập, hoặc null nếu chưa đăng nhập. */
  setAccount(name: string | null) {
    this.account.textContent = name ? `Tài khoản: ${name}` : 'Chưa đăng nhập';
  }

  /** Gợi ý "bấm E". Truyền null để ẩn. */
  setPrompt(text: string | null) {
    const next = text ?? '';
    if (next === this.promptText) return;
    this.promptText = next;
    this.prompt.classList.toggle('hidden', !text);
    if (text) this.prompt.replaceChildren(el('kbd', '', 'E'), text);
  }
}
