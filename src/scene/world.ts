import * as THREE from 'three';
import { createSculpture, type Sculpture } from './sculptures';
import { spatialWorks } from '../content/spatial';
import type { ThemeId } from '../lib/theme';
import { assemblyProgress, configureRenderer, observeSceneTheme, sceneInView, studioLighting } from './theme';
import { dragPadding, dragRadians, drawGuide, newDragArea, projectDragArea, type DragArea } from './dragArea';

export type WorldMode = 'work' | 'play';
type Options = {
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  guides: HTMLElement;
  reduced: boolean;
  onSelect: (id: string) => void;
  onTwist: (value: number) => void;
  onError: () => void;
};
export type WorldController = {
  setMode: (mode: WorldMode) => void;
  focus: (id: string | null) => void;
  setTwist: (value: number) => void;
  resetPlay: () => void;
  moveLetter: (index: number, direction: 'left' | 'right' | 'up' | 'down') => void;
  setReduced: (value: boolean) => void;
  dispose: () => void;
};
type Exhibit = { id: string; sculpture: Sculpture; position: THREE.Vector3; scale: number; mode: WorldMode; area: DragArea; guide: HTMLElement };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const modelRadius = (id: string) => id === 'type' ? 2.5 : 1.4;

export function createWorld(options: Options): WorldController {
  const { canvas, labels, guides } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const normalRatio = Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#efeee9', 18, 34);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
  const key = new THREE.DirectionalLight('#fffaf3', 4);
  key.position.set(-4, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.normalBias = .04;
  key.shadow.bias = -.00015;
  key.shadow.radius = 4;
  const hemisphere = new THREE.HemisphereLight('#faf9ff', '#b8b3a4', 2.5);
  scene.add(key, key.target, hemisphere);
  const fill = new THREE.DirectionalLight('#cbd8ff', 1.2);
  fill.position.set(5, 2, -3);
  scene.add(fill);
  const floorGeometry = new THREE.PlaneGeometry(60, 60);
  const floorMaterial = new THREE.ShadowMaterial({ color: '#666854', opacity: .13 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.1;
  floor.receiveShadow = true;
  scene.add(floor);

  const updateStudio = studioLighting(key, fill, hemisphere, floorMaterial);
  const guideFor = (id: string) => guides.querySelector<HTMLElement>(`[data-exhibit="${id}"]`)!;
  const exhibits: Exhibit[] = spatialWorks.map((item) => {
    const sculpture = createSculpture(item.kind);
    sculpture.group.position.fromArray(item.position);
    sculpture.group.rotation.set(...item.rotation);
    sculpture.group.scale.setScalar(item.scale);
    sculpture.group.traverse((node) => { node.userData.exhibitId = item.slug; });
    scene.add(sculpture.group);
    return { id: item.slug, sculpture, position: new THREE.Vector3(...item.position), scale: item.scale, mode: 'work', area: newDragArea(), guide: guideFor(item.slug) };
  });
  for (const [id, kind, position, scale] of [
    ['ribbon', 'ribbon', [-2, .2, .2], 1.05],
    ['type', 'type', [1.8, -.1, -.1], .85],
  ] as const) {
    const sculpture = createSculpture(kind);
    sculpture.group.position.fromArray(position);
    sculpture.group.scale.setScalar(.001);
    sculpture.group.visible = false;
    sculpture.group.traverse((node) => { node.userData.exhibitId = id; });
    scene.add(sculpture.group);
    exhibits.push({ id, sculpture, position: new THREE.Vector3(...position), scale, mode: 'play', area: newDragArea(), guide: guideFor(id) });
  }
  const type = exhibits.find((item) => item.id === 'type')!;
  const letterOrigins = type.sculpture.parts.map((letter) => ({ position: letter.position.clone(), rotation: letter.rotation.clone() }));
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const target = new THREE.Vector3(0, -.1, 0);
  const goalTarget = target.clone();
  const goalCamera = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  let width = 1, height = 1, mobile = false;
  let mode: WorldMode = 'work';
  let selected: string | null = null;
  let hover: string | null = null;
  let focused: string | null = null;
  let yaw = -.06, pitch = .12, velocity = 0;
  let savedView = { yaw, pitch };
  let framedOffset: number | null = null;
  let reduced = options.reduced;
  let twist = .35;
  let theme: ThemeId = 'spatial';
  let assemblyStart: number | null = null;
  let leaving: { start: number; duration: number } | null = null;
  let snapLayout = false;
  let frame = 0, lastTime = 0, running = sceneInView(canvas), disposed = false, entered = false;
  let pointer: null | { id: number; x: number; y: number; lastX: number; lastTime: number; moved: boolean; yaw: number; pitch: number; hit: string | null; rotate: THREE.Group | null; rotation: THREE.Euler | null; radius: number; turn: number; twist: number; letter: THREE.Object3D | null; letterStart: THREE.Vector3 | null; planeStart: THREE.Vector3 | null } = null;
  const fine = matchMedia('(pointer: fine)').matches;
  const getExhibit = (id: string | null) => exhibits.find((item) => item.id === id);

  function point(event: globalThis.PointerEvent) {
    const box = canvas.getBoundingClientRect();
    mouse.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
  }
  function hit(event: globalThis.PointerEvent) {
    point(event);
    const candidates = exhibits.filter(item => item.mode === mode && (!selected || item.id === selected) && item.sculpture.group.visible);
    const direct = raycaster.intersectObjects(candidates.map(item => item.sculpture.group), true)[0];
    if (direct) return { id: direct.object.userData.exhibitId as string, object: direct.object };

    // Holes and the margin belong to the nearest projected handle. An actual surface always wins.
    const x = (mouse.x + 1) * width / 2, y = (1 - mouse.y) * height / 2;
    let nearest: Exhibit | undefined;
    let best = Infinity;
    for (const item of candidates) {
      const { area } = item;
      const distance = Math.hypot(x - area.x, y - area.y);
      if (area.visible && distance <= area.radius && distance < best) { nearest = item; best = distance; }
    }
    return { id: nearest?.id ?? null, object: null };
  }
  function updateCameraGoal() {
    const active = getExhibit(selected);
    if (active) {
      const p = active.sculpture.group.position;
      goalTarget.copy(p);
      if (framedOffset !== null) {
        goalTarget.x -= Math.cos(yaw) * framedOffset;
        goalTarget.z += Math.sin(yaw) * framedOffset;
      } else if (!mobile) goalTarget.x -= 1.25;
      else goalTarget.y -= 1.95;
      const distance = mobile ? 8.8 : selected === 'type' ? 7.5 : 6.1;
      goalCamera.copy(goalTarget).add(new THREE.Vector3(Math.sin(yaw) * distance, 1.25, Math.cos(yaw) * distance));
    } else {
      goalTarget.set(0, mobile ? -.25 : -.1, 0);
      const distance = mobile ? 12 : 10.8;
      goalCamera.copy(goalTarget).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance));
    }
  }
  function updateLighting() {
    const active = getExhibit(selected);
    key.target.position.copy(active?.position ?? new THREE.Vector3());
    key.position.copy(key.target.position).add(new THREE.Vector3(-4, 7, 6));
    const extent = active ? selected === 'type' ? 4 : 2.6 : 5;
    key.shadow.camera.left = key.shadow.camera.bottom = -extent;
    key.shadow.camera.right = key.shadow.camera.top = extent;
    key.shadow.camera.updateProjectionMatrix();
  }
  function resize() {
    // Layout dimensions exclude the brief CSS scale on the entering canvas.
    const nextWidth = Math.max(1, canvas.clientWidth);
    const nextHeight = Math.max(1, canvas.clientHeight);
    if (width !== nextWidth || height !== nextHeight) renderer.setSize(nextWidth, nextHeight, false);
    width = nextWidth; height = nextHeight;
    // Some editions offset or crop their canvas. The guides share its CSS-pixel coordinate system.
    guides.style.left = canvas.offsetLeft + 'px';
    guides.style.top = canvas.offsetTop + 'px';
    guides.style.width = width + 'px';
    guides.style.height = height + 'px';
    mobile = matchMedia('(max-width: 767px)').matches;
    camera.aspect = width / height;
    camera.fov = mobile ? 42 : 38;
    camera.updateProjectionMatrix();
    // Leave a gutter between silhouettes, including on narrow, tall canvases.
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (mobile ? 12 : 10.8) * camera.aspect;
    const spread = Math.min(1.4, halfWidth / 5.7);
    for (let i = 0; i < spatialWorks.length; i++) {
      const exhibit = exhibits[i]!;
      const work = spatialWorks[i]!;
      exhibit.position.fromArray(work.position);
      exhibit.position.x *= spread;
      exhibit.scale = work.scale * Math.min(1, halfWidth / 3.5);
      const column = i % 2 === 0 ? -1 : 1;
      const upper = i < 2;
      if (theme === 'glass') {
        // Alternate near / far panes along two diagonals.
        const forward = i === 0 || i === 3;
        exhibit.position.x *= forward ? 0.89 : 1.04;
        exhibit.position.y += (forward ? 0.19 : -0.12) + (upper ? 0.18 : -0.22);
        exhibit.position.z = forward ? 0.48 : -0.68;
        exhibit.scale *= forward ? 0.96 : 0.76;
      } else if (theme === 'clay') {
        exhibit.position.x = column * (upper ? 2.75 : 2.95) * spread;
        exhibit.position.y = (upper ? 1.75 : -1.02) + column * 0.16;
        exhibit.scale *= upper ? 0.84 : 0.92;
      } else if (theme === 'minimal' || theme === 'type') {
        // The CSS study has its own narrow canvas next to (or above) the project index.
        const x = column * halfWidth * (theme === 'minimal' ? 0.47 : 0.50);
        const y = upper ? 1.45 : -1.05;
        exhibit.position.set(x, y, 0);
        exhibit.scale *= selected ? 0.88 : theme === 'minimal' ? 0.66 : 0.56;
      } else if (theme === 'blueprint' || theme === 'retro') {
        // An elevation sheet and a desktop both register each item to two columns.
        const y = theme === 'retro' ? (upper ? 1.82 : -1.55) : (upper ? 1.62 : -.92);
        exhibit.position.set(column * halfWidth * .45, y, 0);
        exhibit.scale *= theme === 'retro' ? .79 : .85;
      } else if (theme === 'collage') {
        exhibit.position.set(column * halfWidth * (upper ? .42 : .48), (upper ? 1.65 : -1.1) + column * .23, column * .18);
        exhibit.scale *= upper ? .88 : .81;
      } else if (theme === 'cinema') {
        if (!selected && matchMedia('(min-width:960px)').matches) {
          // Four stills, composed within the short panoramic frame.
          exhibit.position.set((i - 1.5) * halfWidth * .49, .16, 0);
          exhibit.scale *= Math.min(1.06, halfWidth * .145);
        } else {
          exhibit.position.set(column * halfWidth * .47, upper ? 1.83 : -1.55, 0);
          exhibit.scale *= .86;
        }
      } else if (theme === 'organic') {
        exhibit.position.set(column * halfWidth * (upper ? .46 : .39), (upper ? 1.67 : -1.13) + column * (upper ? .27 : -.18), upper ? .22 : -.33);
        exhibit.scale *= upper ? .83 : .93;
      }
      if (mobile) exhibit.position.y += .38;
    }
    const ribbon = getExhibit('ribbon')!;
    const letters = getExhibit('type')!;
    if (mobile) {
      ribbon.position.set(-halfWidth * .2, 2, .1);
      letters.position.set(halfWidth * .08, -.95, -.2);
      ribbon.scale = Math.min(1.05, halfWidth * .4);
      letters.scale = Math.min(.8, halfWidth * .28);
    } else {
      ribbon.position.set(-2.75 * spread, .45, .2);
      letters.position.set(2.45 * spread, -.45, -.2);
      ribbon.scale = 1.05;
      letters.scale = Math.min(.85, halfWidth / 5);
    }
    if (theme !== 'spatial') {
      const playScale = { glass: .92, clay: .87, minimal: .56, type: .52, blueprint: .83, retro: .78, collage: .86, cinema: .88, organic: .92 }[theme];
      ribbon.scale *= playScale;
      letters.scale *= theme === 'type' ? 1 : playScale;
      if (!mobile) {
        ribbon.position.y += theme === 'glass' ? 0.45 : -0.35;
        letters.position.y += theme === 'type' ? 0.7 : 0.24;
      }
    }
    framedOffset = null;
    const active = getExhibit(selected);
    const panel = selected && !mobile ? canvas.parentElement?.querySelector<HTMLElement>('.workspace-detail') : null;
    if (active && panel) {
      // Keep the original close-up when it fits. Otherwise frame it inside the space beside the caption.
      const left = panel.offsetLeft + panel.offsetWidth - canvas.offsetLeft + 10;
      const right = width - 10;
      const depth = Math.hypot(active.id === 'type' ? 7.5 : 6.1, 1.25);
      const px = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth);
      const pad = dragPadding(!fine);
      const originalX = width / 2 + 1.25 * px * Math.cos(yaw);
      const artwork = modelRadius(active.id) * px;
      const radius = active.scale * artwork + pad;
      if (originalX - radius < left || originalX + radius > right) {
        const available = Math.max(pad + 1, (right - left) / 2);
        active.scale = Math.min(active.scale, (available - pad) / artwork);
        const fit = active.scale * artwork + pad;
        const x = clamp(originalX, left + fit, right - fit);
        framedOffset = (x - width / 2) / px;
      }
    }
    if (!entered) {
      for (const exhibit of exhibits) {
        exhibit.sculpture.group.position.copy(exhibit.position);
        exhibit.sculpture.group.scale.setScalar(exhibit.mode === mode ? exhibit.scale : .001);
      }
    }
    updateCameraGoal();
    updateLighting();
    if (!entered) { camera.position.copy(goalCamera); target.copy(goalTarget); }
    invalidate();
  }
  // Project each supporting pane or paper scrap into its artwork's viewport.
  const plateElements = canvas.closest('.workspace')?.querySelectorAll<HTMLElement>('.workspace-plates [data-anchor]');
  function placePlates() {
    if (!plateElements || selected || mode !== 'work' || (theme !== 'glass' && theme !== 'clay' && theme !== 'collage')) return;
    for (const plate of plateElements) {
      const exhibit = getExhibit(plate.dataset.anchor!);
      if (!exhibit) continue;
      const group = exhibit.sculpture.group;
      projected.copy(group.position).applyMatrix4(camera.matrixWorldInverse);
      const pixelsPerUnit = height / (-2 * projected.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      projected.copy(group.position).project(camera);
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      const radius = 1.4 * group.scale.x * pixelsPerUnit;
      const halfWidth = Math.max(0, Math.min(Math.max(radius + 12, 52), x - 6, width - x - 6));
      const top = y - radius - 9;
      projected.copy(group.position);
      projected.y -= 1.35 * exhibit.scale;
      projected.project(camera);
      const labelY = (1 - projected.y) * height / 2 + (mobile ? 11 : 0);
      const bottom = Math.max(y + radius, labelY + 29);
      plate.style.left = x + 'px';
      plate.style.top = (top + bottom) / 2 + 'px';
      plate.style.width = halfWidth * 2 + 'px';
      plate.style.height = bottom - top + 'px';
    }
  }

  function placeLabels() {
    for (const el of labels.querySelectorAll<HTMLElement>('[data-anchor]')) {
      const e = getExhibit(el.dataset.anchor!);
      if (!e || e.mode !== mode || selected) continue;
      projected.copy(e.sculpture.group.position);
      projected.y -= e.id === 'type' ? 1 : 1.35 * e.scale;
      projected.project(camera);
      el.style.left = `${(projected.x + 1) * .5 * width}px`;
      el.style.top = `${(-projected.y + 1) * .5 * height + (mobile ? 11 : 0)}px`;
      // The work overview has a fixed camera. Keeping its labels focusable also
      // restores keyboard focus as the close-up transitions back to the overview.
      const inView = projected.z < 1 && Math.abs(projected.x) < .9 && Math.abs(projected.y) < .82;
      el.style.visibility = mode === 'work' || inView ? 'visible' : 'hidden';
    }
  }
  function placeGuides() {
    for (const item of exhibits) {
      const group = item.sculpture.group;
      if (item.mode !== mode || (selected && selected !== item.id) || !group.visible) { item.area.visible = false; continue; }
      projectDragArea(item.area, group.position, modelRadius(item.id) * group.scale.x, camera, width, height, !fine);
    }
    for (const item of exhibits) {
      if (item.area.visible && !selected) {
        const { x, y } = item.area;
        const edge = Math.min(x, width - x, y, height - y);
        item.area.radius = Math.min(item.area.radius, Math.max(0, edge - 4));
        item.area.visible = item.area.radius >= 8;
        for (const other of exhibits) {
          if (item === other || !other.area.visible) continue;
          const gap = Math.hypot(item.area.x - other.area.x, item.area.y - other.area.y);
          item.area.radius = Math.min(item.area.radius, Math.max(22, gap / 2 - 4));
        }
      }
      const dragging = pointer?.moved && (pointer.hit ?? selected) === item.id;
      const state = dragging ? 'drag' : hover === item.id ? 'hover' : focused === item.id ? 'focus' : 'idle';
      drawGuide(item.guide, item.area, state, dragging ? pointer!.turn : 0);
    }
  }
  function render(now: number) {
    frame = 0;
    if (disposed || !running) return;
    const dt = Math.min(.05, lastTime ? (now - lastTime) / 1000 : 1 / 60);
    lastTime = now;
    const assembly = assemblyStart === null ? 1 : assemblyProgress(theme, assemblyStart, now);
    const finishAssembly = assemblyStart !== null && assembly === 1;
    const speed = assemblyStart !== null && theme === 'minimal' ? 24 : 9;
    const ease = reduced || snapLayout || finishAssembly ? 1 : 1 - Math.exp(-dt * speed);
    snapLayout = false;
    if (!selected && !pointer && Math.abs(velocity) > .0005) {
      yaw += velocity * dt;
      velocity *= Math.exp(-dt * 8);
    } else if (Math.abs(velocity) <= .0005) velocity = 0;
    let unsettled = false;
    const departure = leaving ? THREE.MathUtils.clamp((now - leaving.start) / leaving.duration, 0, 1) : 0;
    for (const [index, e] of exhibits.entries()) {
      if (leaving && e.mode === mode && (!selected || selected === e.id)) {
        e.sculpture.disperse(departure);
      } else if (assemblyStart !== null) {
        const progress = THREE.MathUtils.clamp(assembly * 1.22 - (index % 4) * 0.07, 0, 1);
        e.sculpture.assemble(theme, progress);
      }
      const visible = e.mode === mode;
      const desired = visible ? e.scale * (selected && selected !== e.id ? 0 : 1) : 0;
      const scale = THREE.MathUtils.lerp(e.sculpture.group.scale.x, desired, ease);
      e.sculpture.group.scale.setScalar(Math.max(.001, scale));
      e.sculpture.group.visible = scale > .008;
      const position = e.position.clone();
      if (visible && selected && selected !== e.id) position.z -= 2;
      e.sculpture.group.position.lerp(position, ease);
      e.sculpture.update(0, hover === e.id ? 1 : 0, e.id === 'ribbon' ? twist : .35);
      if (Math.abs(scale - desired) > .001 || e.sculpture.group.position.distanceTo(position) > .002) unsettled = true;
    }
    updateCameraGoal();
    camera.position.lerp(goalCamera, ease);
    target.lerp(goalTarget, ease);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    try { renderer.render(scene, camera); }
    catch { options.onError(); return; }
    placeLabels();
    placePlates();
    placeGuides();
    canvas.dataset.viewYaw = yaw.toFixed(4);
    canvas.dataset.selected = selected ?? '';
    canvas.dataset.twist = String(Math.round(twist * 100));
    if (!entered) { entered = true; canvas.dataset.ready = 'true'; }
    if (assembly === 1) assemblyStart = null;
    const moving = (leaving !== null && departure < 1) || assemblyStart !== null || camera.position.distanceTo(goalCamera) > .002 || target.distanceTo(goalTarget) > .002 || unsettled || Math.abs(velocity) > .0005;
    canvas.dataset.settled = String(!moving && !pointer?.moved);
    if (moving) invalidate();
  }
  function invalidate() {
    canvas.dataset.settled = 'false';
    if (!frame && !disposed && running) frame = requestAnimationFrame(render);
  }
  function resetPointer() {
    const id = pointer?.id;
    if (!disposed && pointer && Math.abs(twist - pointer.twist) > .0001) options.onTwist(Math.round(twist * 100));
    pointer = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.classList.remove('is-dragging');
  }
  function pointerDown(event: globalThis.PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    const target = hit(event);
    // Keep the drag bound to the work under the initial press, even across other works.
    const hitId = target.id;
    if (mode === 'work' && !selected && !hitId) return;
    const exhibit = getExhibit(selected ?? hitId);
    const rotate = exhibit?.sculpture.group ?? null;
    let letter: THREE.Object3D | null = target.object;
    while (letter && letter.userData.letterIndex === undefined) letter = letter.parent;
    if (selected !== 'type') letter = null;
    let planeStart: THREE.Vector3 | null = null;
    if (letter) {
      camera.getWorldDirection(direction);
      letter.getWorldPosition(dragPoint);
      dragPlane.setFromNormalAndCoplanarPoint(direction, dragPoint);
      planeStart = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
    }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), moved: false, yaw, pitch, hit: hitId, rotate, rotation: rotate?.rotation.clone() ?? null, radius: exhibit?.area.radius ?? 0, turn: 0, twist, letter, letterStart: letter?.position.clone() ?? null, planeStart };
    velocity = 0;
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: globalThis.PointerEvent) {
    if (!pointer) {
      if (!fine || event.buttons !== 0) return;
      const next = hit(event).id;
      if (hover !== next) { hover = next; canvas.style.cursor = next ? 'grab' : ''; invalidate(); }
      return;
    }
    if (pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (event.pointerType === 'touch' && !pointer.moved) {
      if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) { resetPointer(); return; }
      if (Math.abs(dx) <= 7) return;
    }
    if (!pointer.moved && Math.hypot(dx, dy) <= 7) return;
    pointer.moved = true;
    canvas.classList.add('is-dragging');
    pointer.turn = dragRadians(dx, pointer.radius);
    if (pointer.letter && pointer.letterStart && pointer.planeStart) {
      point(event);
      const at = raycaster.ray.intersectPlane(dragPlane, dragPoint);
      if (at) {
        const parent = pointer.letter.parent!;
        const start = parent.worldToLocal(pointer.planeStart.clone());
        const next = parent.worldToLocal(at.clone());
        pointer.letter.position.copy(pointer.letterStart).add(next.sub(start));
        pointer.letter.position.x = clamp(pointer.letter.position.x, -4, 4);
        pointer.letter.position.y = clamp(pointer.letter.position.y, -2, 2);
        pointer.letter.rotation.z = clamp(dx * .002, -.4, .4);
        pointer.turn = pointer.letter.rotation.z;
      }
    } else if (selected === 'ribbon') {
      twist = clamp(pointer.twist + dx / width, 0, 1);
      pointer.turn = (twist - pointer.twist) * Math.PI * 2;
    } else if (pointer.rotate && pointer.rotation) {
      const g = pointer.rotate;
      g.rotation.y = pointer.rotation.y + pointer.turn;
      g.rotation.x = clamp(pointer.rotation.x + (event.pointerType === 'touch' ? 0 : dragRadians(dy, pointer.radius)), -1.3, 1.3);
    } else {
      yaw = pointer.yaw + dx / width * 3.2;
      pitch = clamp(pointer.pitch + (mobile ? 0 : dy / height * 1.1), -.18, .5);
      const now = performance.now();
      velocity = reduced ? 0 : clamp((event.clientX - pointer.lastX) / Math.max(8, now - pointer.lastTime) / width * 2400, -1.8, 1.8);
      pointer.lastX = event.clientX; pointer.lastTime = now;
    }
    invalidate();
  }
  function pointerUp(event: globalThis.PointerEvent, cancelled = false) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const click = !pointer.moved && !cancelled ? pointer.hit : null;
    if (cancelled) velocity = 0;
    if (pointer.letter) canvas.dataset.letterPosition = `${pointer.letter.userData.letterIndex}:${pointer.letter.position.x.toFixed(2)},${pointer.letter.position.y.toFixed(2)}`;
    resetPointer();
    hover = !cancelled && event.pointerType !== 'touch' && document.elementFromPoint(event.clientX, event.clientY) === canvas
      ? hit(event).id : null;
    canvas.style.cursor = hover ? 'grab' : '';
    if (click && !selected) options.onSelect(click);
    invalidate();
  }
  function leave() { if (!pointer) { hover = null; canvas.style.cursor = ''; invalidate(); } }
  function syncFocus() {
    const active = document.activeElement;
    focused = active instanceof HTMLElement && active.matches(':focus-visible')
      ? active === canvas ? selected : active.dataset.anchor ?? null : null;
    invalidate();
  }
  function clearFocus() { focused = null; invalidate(); }
  function keyDown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    if (mode === 'work' && !selected) return;
    event.preventDefault();
    resetPointer(); velocity = 0;
    const active = getExhibit(selected);
    if (event.key === 'Home') {
      yaw = -.06; pitch = .12;
      if (active) {
        const work = spatialWorks.find((item) => item.slug === selected);
        active.sculpture.group.rotation.set(...(work?.rotation ?? [0, 0, 0]));
      }
      if (selected === 'ribbon') { twist = .35; options.onTwist(35); }
    } else if (selected === 'ribbon') {
      twist = clamp(twist + (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -.05 : .05), 0, 1);
      options.onTwist(Math.round(twist * 100));
    } else if (active) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') active.sculpture.group.rotation.y += event.key === 'ArrowLeft' ? -.15 : .15;
      else active.sculpture.group.rotation.x = clamp(active.sculpture.group.rotation.x + (event.key === 'ArrowUp' ? -.15 : .15), -1.3, 1.3);
    } else {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') yaw += event.key === 'ArrowLeft' ? -.15 : .15;
      else pitch = clamp(pitch + (event.key === 'ArrowUp' ? -.08 : .08), -.18, .5);
    }
    invalidate();
  }
  function contextLost(event: Event) { event.preventDefault(); options.onError(); }
  function resetThemeMotion() {
    if (!leaving && assemblyStart === null) return;
    leaving = null;
    assemblyStart = null;
    exhibits.forEach((exhibit) => exhibit.sculpture.assemble(theme, 1));
    invalidate();
  }
  function visibility() {
    running = sceneInView(canvas);
    if (!running) { cancelAnimationFrame(frame); frame = 0; resetPointer(); velocity = 0; resetThemeMotion(); }
    else { lastTime = 0; invalidate(); }
  }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  const onUp = (e: globalThis.PointerEvent) => pointerUp(e);
  const onCancel = (e: globalThis.PointerEvent) => pointerUp(e, true);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', onCancel);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('focus', syncFocus);
  canvas.addEventListener('blur', clearFocus);
  labels.addEventListener('focusin', syncFocus);
  labels.addEventListener('focusout', clearFocus);
  document.addEventListener('visibilitychange', visibility);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const viewport = new IntersectionObserver(visibility);
  viewport.observe(canvas);
  const stopTheme = observeSceneTheme(canvas, (next, animate) => {
    theme = next;
    leaving = null;
    assemblyStart = animate && !reduced ? performance.now() : null;
    snapLayout = assemblyStart === null || next === 'type' || next === 'minimal' || next === 'blueprint' || next === 'retro' || next === 'cinema';
    updateStudio(theme);
    floor.visible = floorMaterial.opacity > 0;
    configureRenderer(renderer, theme, normalRatio);
    scene.fog!.color.set(theme === 'spatial' ? '#efeee9' : getComputedStyle(canvas).getPropertyValue('--paper').trim() || '#efeee9');
    for (const exhibit of exhibits) {
      exhibit.sculpture.setTheme(theme);
      exhibit.sculpture.assemble(theme, assemblyStart === null ? 1 : 0);
    }
    running = sceneInView(canvas);
    resize();
    // The DOM transition measures incoming plates before this frame is painted.
    if (entered) placePlates();
  }, (duration) => {
    if (reduced || !running) return;
    resetThemeMotion();
    for (const exhibit of exhibits) {
      if (exhibit.mode === mode && (!selected || selected === exhibit.id)) exhibit.sculpture.prepareExit(camera);
    }
    leaving = { start: performance.now(), duration };
    invalidate();
  }, resetThemeMotion);

  return {
    setMode(next) {
      if (mode === next) return;
      mode = next; selected = null; hover = null; velocity = 0; resetPointer();
      yaw = -.06; pitch = .12;
      canvas.style.cursor = '';
      canvas.dataset.mode = next;
      resize();
    },
    focus(id) {
      if (selected === id) return;
      if (id && !selected) savedView = { yaw, pitch };
      selected = id; hover = null; velocity = 0; resetPointer();
      canvas.style.cursor = '';
      if (!id) { yaw = savedView.yaw; pitch = savedView.pitch; }
      resize();
    },
    setTwist(value) { const next = clamp(value / 100, 0, 1); if (next !== twist) { twist = next; invalidate(); } },
    resetPlay() {
      twist = .35;
      type.sculpture.parts.forEach((letter, index) => {
        const origin = letterOrigins[index];
        if (origin) { letter.position.copy(origin.position); letter.rotation.copy(origin.rotation); }
      });
      options.onTwist(35);
      delete canvas.dataset.letterPosition;
      invalidate();
    },
    moveLetter(index, direction) {
      const letter = type.sculpture.parts[index];
      if (!letter) return;
      if (direction === 'left' || direction === 'right') letter.position.x = clamp(letter.position.x + (direction === 'left' ? -.25 : .25), -4, 4);
      else letter.position.y = clamp(letter.position.y + (direction === 'down' ? -.25 : .25), -2, 2);
      canvas.dataset.letterPosition = `${index}:${letter.position.x.toFixed(2)},${letter.position.y.toFixed(2)}`;
      invalidate();
    },
    setReduced(value) {
      reduced = value;
      if (value) {
        velocity = 0;
        resetThemeMotion();
      }
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); resetPointer(); observer.disconnect(); viewport.disconnect(); stopTheme();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel); canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('keydown', keyDown);
      canvas.removeEventListener('focus', syncFocus); canvas.removeEventListener('blur', clearFocus);
      labels.removeEventListener('focusin', syncFocus); labels.removeEventListener('focusout', clearFocus);
      exhibits.forEach((item) => item.sculpture.dispose());
      floorGeometry.dispose(); floorMaterial.dispose(); key.shadow.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
