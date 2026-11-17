import { GAMES, type GameDef } from '../data/games';
import { button, el, panelFrame } from './dom';

/** Chọn game để chạy thử trên bộ PC vừa ráp. */
export function gamePicker(cb: {
  onPick: (game: GameDef) => void;
  onRebuild: () => void;
  onClose: () => void;
}): HTMLElement {
  const { panel, body, foot } = panelFrame('Chọn game', cb.onClose);
  const grid = el('div', 'games');
  for (const game of GAMES) {
    const card = el('button', 'game-card', game.name);
    card.type = 'button';
    card.style.background = game.color;
    card.style.borderColor = game.accent;
    card.append(el('small', '', 'Chạy thử ở 1080p'));
    card.addEventListener('click', () => cb.onPick(game));
    grid.append(card);
  }
  body.append(grid);
  foot.append(
    el('span', 'muted', 'FPS sẽ hiện trên màn hình PC.'),
    button('Ráp lại PC', 'ghost', cb.onRebuild),
  );
  return panel;
}

/** Thanh nút hiện ở đáy màn hình trong lúc camera zoom vào màn hình PC. */
export function monitorBar(cb: { onChange: () => void; onLeave: () => void }): HTMLElement {
  const bar = el('div', 'monitor-bar');
  bar.append(
    button('Đổi game', '', cb.onChange),
    button('Rời máy tính [Esc]', 'ghost', cb.onLeave),
  );
  return bar;
}
