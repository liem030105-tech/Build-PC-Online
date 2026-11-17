import '@fontsource/vt323';
import './ui/ui.css';
import * as THREE from 'three';
import type { GameDef } from './data/games';
import { CATEGORIES, buildPrice, resolveBuild } from './data/parts';
import { CameraRig } from './engine/cameraRig';
import { Input } from './engine/input';
import { DETAIL_MONITOR, DETAIL_WORLD, PixelRenderer } from './engine/renderer';
import { estimateFps } from './sim/fps';
import { loadCatalog } from './state/catalog';
import { session } from './state/session';
import { store } from './state/store';
import { buildPanel } from './ui/buildPanel';
import { cloudPanel } from './ui/cloudPanel';
import { clearUi, showUi } from './ui/dom';
import { gamePicker, monitorBar } from './ui/gamePicker';
import { Hud } from './ui/hud';
import { introPanel } from './ui/introPanel';
import { MonitorScreen } from './ui/monitorScreen';
import { buildHome } from './world/areas/home';
import { Player } from './world/player';
import type { Area, GameActions, Interactable } from './world/types';

/** play: đang đi lại. panel: đang mở một bảng. monitor: đang nhìn màn hình PC. */
type Mode = 'play' | 'panel' | 'monitor';

function findNearest(area: Area, pos: { x: number; z: number }): Interactable | null {
  let best: Interactable | null = null;
  let bestDist = Infinity;
  for (const it of area.interactables) {
    const d = Math.hypot(it.x - pos.x, it.z - pos.z);
    if (d <= it.radius && d < bestDist) {
      best = it;
      bestDist = d;
    }
  }
  return best;
}

function goalText(): string {
  const s = store.state;
  if (s.pcBuilt) return 'Tới bàn máy tính để chọn game và xem FPS.';
  if (fittedCount() === 0) return 'Tới bàn máy tính để ráp PC.';
  return 'Tới bàn máy tính để ráp tiếp và khởi động máy.';
}

const fittedCount = () => CATEGORIES.filter((c) => store.state.build[c.id]).length;

async function boot() {
  // Chờ font pixel tải xong để chữ trên biển hiệu trong thế giới 3D vẽ đúng font.
  try {
    await Promise.race([
      document.fonts.load("32px 'VT323'", 'Chưa có PC'),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // Không tải được font thì dùng font dự phòng.
  }

  // Danh mục linh kiện phải có trước khi đọc tiến trình đã lưu và dựng giao diện.
  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.textContent = 'Đang tải danh mục linh kiện...';
  document.getElementById('ui')!.append(loading);
  const catalog = await loadCatalog(session.client.configured ? () => session.client.listParts() : null);
  store.hydrate();
  loading.remove();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const pixel = new PixelRenderer(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94b8, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const input = new Input(canvas);
  const rig = new CameraRig();
  const player = new Player();
  scene.add(player.group);
  const hud = new Hud(document.getElementById('hud')!);
  const monitor = new MonitorScreen();

  let mode: Mode = 'play';
  let nearest: Interactable | null = null;

  const syncMonitor = () => (store.state.pcBuilt ? monitor.setDesktop() : monitor.setOff());
  const refreshHud = () => {
    hud.setBuild(buildPrice(store.state.build), fittedCount(), CATEGORIES.length);
    hud.setGoal(goalText());
  };

  function closePanel() {
    clearUi();
    mode = 'play';
  }

  function openModal(node: HTMLElement) {
    showUi(node);
    mode = 'panel';
  }

  /** Rời màn hình PC: camera quay lại theo nhân vật. */
  function leaveFocus() {
    rig.focus = null;
    player.group.visible = true;
    hud.setVisible(true);
    pixel.setDetail(DETAIL_WORLD);
    syncMonitor();
  }

  function leaveMonitor() {
    leaveFocus();
    closePanel();
  }

  function openBuild() {
    leaveFocus();
    openModal(
      buildPanel({
        onClose: closePanel,
        onCloud: () => openCloud(true),
        onBoot: () => {
          store.markBuilt();
          openGames();
        },
      }),
    );
  }

  /** Bảng tài khoản và build lưu trên Xano. `fromBuild`: mở từ màn hình ráp PC. */
  function openCloud(fromBuild = false) {
    openModal(cloudPanel({ onClose: closePanel, onBack: fromBuild ? openBuild : undefined }));
  }

  function openGames() {
    leaveFocus();
    openModal(gamePicker({ onPick: startGame, onRebuild: openBuild, onClose: closePanel }));
  }

  function startGame(game: GameDef) {
    const fps = estimateFps(resolveBuild(store.state.build), game);
    const focus = room.monitorFocus;
    if (!fps || !focus) return;
    store.setGame(game.id);
    monitor.setGame(game, fps);
    rig.focus = focus;
    player.group.visible = false;
    hud.setVisible(false);
    pixel.setDetail(DETAIL_MONITOR);
    showUi(monitorBar({ onChange: openGames, onLeave: leaveMonitor }), 'bar');
    mode = 'monitor';
  }

  const actions: GameActions = {
    useDesk: () => (store.state.pcBuilt ? openGames() : openBuild()),
  };

  // Cả trò chơi diễn ra trong một căn phòng: nhân vật không ra ngoài được.
  const room = buildHome(actions, monitor);
  scene.add(room.group);
  scene.background = new THREE.Color(room.sky);
  const start = room.spawns.start;
  player.place(start.x, start.z, start.facing);
  rig.snap();
  hud.setArea(room.title);

  store.subscribe(() => {
    refreshHud();
    if (mode !== 'monitor') syncMonitor();
  });

  input.onKey = (code) => {
    if (code === 'Escape') {
      if (mode === 'monitor') leaveMonitor();
      else if (mode === 'panel') closePanel();
    } else if (code === 'KeyL' && mode === 'play') {
      openCloud();
    } else if (code === 'KeyE' && mode === 'play') {
      nearest?.action();
    }
  };

  const onResize = () => {
    pixel.resize();
    rig.camera.aspect = window.innerWidth / window.innerHeight;
    rig.camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);
  onResize();

  const refreshAccount = () => hud.setAccount(session.account ? session.account.name || session.account.email : null);
  session.subscribe(refreshAccount);
  refreshAccount();
  void session.restore();

  syncMonitor();
  refreshHud();
  openModal(introPanel(fittedCount() > 0, catalog, closePanel));

  let t = 0;
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    const pointer = input.consumePointer();
    const canMove = mode === 'play';
    let dirX = 0;
    let dirZ = 0;
    if (canMove) {
      rig.rotate(pointer.dx, pointer.dy, pointer.wheel);
      const axis = input.axis();
      if (axis.x !== 0 || axis.y !== 0) {
        // Đi theo hướng camera: "tiến" là hướng camera đang nhìn trên mặt đất.
        const f = rig.forward();
        dirX = f.x * axis.y - f.z * axis.x;
        dirZ = f.z * axis.y + f.x * axis.x;
        const len = Math.hypot(dirX, dirZ);
        dirX /= len;
        dirZ /= len;
      }
    }
    player.update(dt, dirX, dirZ, room.colliders, room.bounds);

    nearest = canMove ? findNearest(room, player.group.position) : null;
    hud.setPrompt(nearest ? nearest.label() : null);

    rig.update(dt, player.group.position);
    room.update?.(rig.camera.position, t);
    monitor.draw(t);
    pixel.renderer.render(scene, rig.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (import.meta.env.DEV) {
    // Móc gỡ lỗi khi phát triển: dịch chuyển nhân vật và xem trạng thái từ console.
    Object.assign(window, { __game: { store, room, player, rig, actions, catalog } });
  }
}

boot();
