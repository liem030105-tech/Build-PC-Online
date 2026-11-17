import { CATEGORIES, PART_BY_ID, buildPrice as priceOf, type BuildIds } from '../data/parts';
import type { SavedBuild } from '../net/xano';
import { session } from '../state/session';
import { store } from '../state/store';
import { button, el, panelFrame, vnd } from './dom';

function input(type: string, placeholder: string, value: string, autocomplete: string): HTMLInputElement {
  const node = el('input', 'field');
  node.type = type;
  node.placeholder = placeholder;
  node.value = value;
  node.setAttribute('autocomplete', autocomplete);
  node.spellcheck = false;
  return node;
}

/** Tóm tắt một build bằng tên CPU và GPU, hai món quyết định FPS. */
function summary(ids: BuildIds): string {
  const names = [ids.cpu, ids.gpu].map((id) => PART_BY_ID.get(id ?? '')?.name).filter(Boolean);
  const count = CATEGORIES.filter((c) => PART_BY_ID.has(ids[c.id] ?? '')).length;
  return `${names.join(' + ') || 'Chưa có CPU/GPU'} · ${count}/${CATEGORIES.length} linh kiện`;
}

/**
 * Tài khoản và build lưu trên Xano. Chưa đăng nhập thì hiện form đăng nhập/đăng ký;
 * đăng nhập rồi thì lưu build đang ráp, xem danh sách, tải lại hoặc xóa.
 */
export function cloudPanel(cb: { onClose: () => void; onBack?: () => void }): HTMLElement {
  const { panel, body, foot } = panelFrame('Lưu build', cb.onClose);

  let tab: 'login' | 'signup' = 'login';
  let busy = false;
  let error = '';
  let notice = '';
  let builds: SavedBuild[] | null = null;
  let armedDelete: number | null = null;
  // Giữ giá trị đang gõ qua các lần vẽ lại bảng. Mật khẩu chỉ nằm trong bộ nhớ
  // khi bảng còn mở và bị xóa ngay sau khi đăng nhập xong.
  const form = { name: '', email: '', password: '', buildName: '' };

  /** Chạy một thao tác mạng: khóa nút trong lúc chờ, hiện lỗi nếu hỏng. */
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    busy = true;
    error = '';
    notice = '';
    render();
    try {
      await task();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    busy = false;
    render();
  };

  const refresh = async () => {
    builds = await session.client.listBuilds();
  };

  const messages = () => {
    if (error) body.append(el('div', 'status', error));
    if (notice) body.append(el('div', 'status ok', notice));
    if (busy) body.append(el('p', 'muted', 'Đang xử lý...'));
  };

  const renderAuth = () => {
    const tabs = el('div', 'tabs');
    for (const [id, label] of [['login', 'Đăng nhập'], ['signup', 'Đăng ký']] as const) {
      const t = button(label, tab === id ? '' : 'ghost', () => {
        tab = id;
        error = '';
        render();
      });
      t.disabled = busy;
      tabs.append(t);
    }

    const formEl = el('form', 'form');
    const fields: Array<[keyof typeof form, HTMLInputElement]> = [];
    if (tab === 'signup') fields.push(['name', input('text', 'Tên hiển thị', form.name, 'nickname')]);
    fields.push(['email', input('email', 'Email', form.email, 'email')]);
    fields.push([
      'password',
      input(
        'password',
        tab === 'signup' ? 'Mật khẩu (ít nhất 8 ký tự)' : 'Mật khẩu',
        form.password,
        tab === 'signup' ? 'new-password' : 'current-password',
      ),
    ]);
    for (const [key, node] of fields) {
      node.required = true;
      node.disabled = busy;
      node.addEventListener('input', () => (form[key] = node.value));
      formEl.append(node);
    }
    const submit = el('button', 'btn go', tab === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập');
    submit.type = 'submit';
    submit.disabled = busy;
    formEl.append(submit);
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      run(async () => {
        if (tab === 'signup') await session.signup(form.name.trim(), form.email.trim(), form.password);
        else await session.login(form.email.trim(), form.password);
        form.password = '';
        await refresh();
      });
    });

    body.append(
      el('p', 'muted', 'Đăng nhập để lưu build lên máy chủ và mở lại trên bất kỳ máy nào.'),
      tabs,
      formEl,
    );
    messages();
    foot.append(el('span', 'muted', 'Mật khẩu được gửi thẳng tới Xano, trò chơi không lưu lại.'));
  };

  const renderBuilds = () => {
    const account = session.account!;
    const head = el('div', 'row');
    head.append(
      el('span', '', `Xin chào, ${account.name || account.email}`),
      button('Đăng xuất', 'ghost', () => {
        session.logout();
        builds = null;
        error = notice = '';
        render();
      }),
    );
    body.append(head);

    // Lưu build đang ráp
    const current = store.state.build;
    const hasParts = CATEGORIES.some((c) => current[c.id]);
    const saveForm = el('form', 'row');
    const nameInput = input('text', 'Đặt tên cho build đang ráp', form.buildName, 'off');
    nameInput.maxLength = 40;
    nameInput.disabled = busy || !hasParts;
    nameInput.addEventListener('input', () => (form.buildName = nameInput.value));
    const save = el('button', 'btn go', 'Lưu build');
    save.type = 'submit';
    save.disabled = busy || !hasParts;
    saveForm.append(nameInput, save);
    saveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.buildName.trim();
      if (!name) {
        error = 'Hãy đặt tên cho build trước khi lưu.';
        render();
        return;
      }
      run(async () => {
        await session.client.saveBuild(name, { ...current }, priceOf(current));
        form.buildName = '';
        notice = `Đã lưu "${name}".`;
        await refresh();
      });
    });
    body.append(el('div', 'group-title', 'Build đang ráp'));
    body.append(
      el('div', 'muted', hasParts ? `${summary(current)} · ${vnd(priceOf(current))}` : 'Chưa chọn linh kiện nào. Hãy ráp PC ở bàn máy tính trước.'),
      saveForm,
    );
    messages();

    // Danh sách đã lưu
    body.append(el('div', 'group-title', 'Build đã lưu'));
    if (builds === null) {
      if (!busy && !error) body.append(el('p', 'muted', 'Đang tải danh sách...'));
    } else if (builds.length === 0) {
      body.append(el('p', 'muted', 'Chưa có build nào được lưu.'));
    } else {
      for (const b of builds) {
        const row = el('div', 'item');
        const main = el('div', 'item-main');
        const date = b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : '';
        main.append(
          el('div', 'item-name', b.name || '(không tên)'),
          el('div', 'muted', [summary(b.parts), date].filter(Boolean).join(' · ')),
        );
        const load = button('Tải', '', () => {
          const dropped = store.loadBuild(b.parts);
          error = '';
          notice =
            `Đã tải "${b.name}" vào các khe ráp PC.` +
            (dropped > 0 ? ` ${dropped} linh kiện không còn trong danh mục nên bị bỏ qua.` : '') +
            ' Mở "Ráp PC" ở bàn máy tính để khởi động.';
          render();
        });
        const armed = armedDelete === b.id;
        const del = button(armed ? 'Xóa thật?' : 'Xóa', armed ? 'danger' : 'ghost', () => {
          if (!armed) {
            armedDelete = b.id;
            render();
            return;
          }
          armedDelete = null;
          run(async () => {
            await session.client.deleteBuild(b.id);
            notice = `Đã xóa "${b.name}".`;
            await refresh();
          });
        });
        load.disabled = del.disabled = busy;
        row.append(main, el('div', 'item-price', vnd(b.total_price || priceOf(b.parts))), load, del);
        body.append(row);
      }
    }
    foot.append(el('span', 'muted', 'Tải một build sẽ thay cấu hình đang ráp.'));
    if (cb.onBack) foot.append(button('Quay lại ráp PC', '', cb.onBack));
  };

  function render() {
    body.replaceChildren();
    foot.replaceChildren();
    if (!session.client.configured) {
      body.append(
        el('div', 'status', 'Chưa cấu hình máy chủ. Hãy điền VITE_XANO_API_URL trong file .env.local rồi chạy lại trò chơi.'),
      );
      foot.append(el('span', 'muted', 'Xem file .env.example để biết cách điền.'));
    } else if (session.account) {
      renderBuilds();
    } else {
      renderAuth();
    }
  }

  render();
  if (session.client.configured) {
    if (session.account) {
      run(refresh);
    } else if (session.client.hasToken) {
      // Có token nhưng chưa xác nhận được tài khoản (ví dụ lúc mở game bị rớt mạng): thử lại.
      run(async () => {
        await session.restore();
        if (session.account) await refresh();
      });
    }
  }
  return panel;
}
