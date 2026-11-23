import * as THREE from 'three';
import { createSculpture, type Sculpture } from './sculptures';
import { spatialWorks } from '../content/spatial';

export type WorldMode = 'work' | 'play';
type Options = {
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  reduced: boolean;
  onSelect: (id: string) => void;
  onInteract: () => void;
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
type Exhibit = { id: string; sculpture: Sculpture; position: THREE.Vector3; scale: number; mode: WorldMode };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function createWorld(options: Options): WorldController {
  const { canvas, labels } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5));
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
  scene.add(key, key.target, new THREE.HemisphereLight('#faf9ff', '#b8b3a4', 2.5));
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

  const exhibits: Exhibit[] = spatialWorks.map((item) => {
    const sculpture = createSculpture(item.kind);
    sculpture.group.position.fromArray(item.position);
    sculpture.group.rotation.set(...item.rotation);
    sculpture.group.scale.setScalar(item.scale);
    sculpture.group.traverse((node) => { node.userData.exhibitId = item.slug; });
    scene.add(sculpture.group);
    return { id: item.slug, sculpture, position: new THREE.Vector3(...item.position), scale: item.scale, mode: 'work' };
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
    exhibits.push({ id, sculpture, position: new THREE.Vector3(...position), scale, mode: 'play' });
  }
  const type = exhibits.find((item) => item.id === 'type')!;
  const letterOrigins = type.sculpture.group.children.map((letter) => ({ position: letter.position.clone(), rotation: letter.rotation.clone() }));
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
  let yaw = -.06, pitch = .12, velocity = 0;
  let savedView = { yaw, pitch };
  let reduced = options.reduced;
  let twist = .35;
  let frame = 0, lastTime = 0, running = true, disposed = false, entered = false;
  let pointer: null | { id: number; x: number; y: number; lastX: number; lastTime: number; moved: boolean; yaw: number; pitch: number; hit: string | null; rotate: THREE.Group | null; rotation: THREE.Euler | null; twist: number; letter: THREE.Object3D | null; letterStart: THREE.Vector3 | null; planeStart: THREE.Vector3 | null } = null;
  const fine = matchMedia('(pointer: fine)').matches;
  const getExhibit = (id: string | null) => exhibits.find((item) => item.id === id);

  function point(event: globalThis.PointerEvent) {
    const box = canvas.getBoundingClientRect();
    mouse.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
  }
  function hit(event: globalThis.PointerEvent) {
    point(event);
    const objects = exhibits.filter((item) => item.mode === mode && item.sculpture.group.visible).map((item) => item.sculpture.group);
    return raycaster.intersectObjects(objects, true)[0];
  }
  function updateCameraGoal() {
    const active = getExhibit(selected);
    if (active) {
      const p = active.sculpture.group.position;
      goalTarget.copy(p);
      if (!mobile) goalTarget.x -= 1.25;
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
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    mobile = width < 768;
    camera.aspect = width / height;
    camera.fov = mobile ? 42 : 38;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    // Leave a gutter between silhouettes, including on narrow, tall canvases.
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (mobile ? 12 : 10.8) * camera.aspect;
    const spread = Math.min(1.4, halfWidth / 5.7);
    for (let i = 0; i < spatialWorks.length; i++) {
      const exhibit = exhibits[i]!;
      const work = spatialWorks[i]!;
      exhibit.position.fromArray(work.position);
      exhibit.position.x *= spread;
      exhibit.scale = work.scale * Math.min(1, halfWidth / 3.5);
      if (mobile) exhibit.position.y += .38;
    }
    if (mobile) {
      getExhibit('ribbon')!.position.set(-.5, 1, .1);
      getExhibit('type')!.position.set(.5, -1.25, -.2);
      getExhibit('type')!.scale = .65;
    } else {
      getExhibit('ribbon')!.position.set(-2, .2, .2);
      getExhibit('type')!.position.set(1.8, -.1, -.1);
      getExhibit('type')!.scale = .85;
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
  function placeLabels() {
    for (const el of labels.querySelectorAll<HTMLElement>('[data-anchor]')) {
      const e = getExhibit(el.dataset.anchor!);
      if (!e || e.mode !== mode || selected) { el.style.visibility = 'hidden'; continue; }
      projected.copy(e.sculpture.group.position);
      projected.y -= e.id === 'type' ? 1 : 1.35 * e.scale;
      projected.project(camera);
      el.style.left = `${(projected.x + 1) * .5 * width}px`;
      el.style.top = `${(-projected.y + 1) * .5 * height}px`;
      el.style.visibility = projected.z < 1 && Math.abs(projected.x) < .9 && Math.abs(projected.y) < .82 ? 'visible' : 'hidden';
    }
  }
  function render(now: number) {
    frame = 0;
    if (disposed || !running) return;
    const dt = Math.min(.05, lastTime ? (now - lastTime) / 1000 : 1 / 60);
    lastTime = now;
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 9);
    if (!selected && !pointer && Math.abs(velocity) > .0005) {
      yaw += velocity * dt;
      velocity *= Math.exp(-dt * 8);
    } else if (Math.abs(velocity) <= .0005) velocity = 0;
    let unsettled = false;
    for (const e of exhibits) {
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
    canvas.dataset.viewYaw = yaw.toFixed(4);
    canvas.dataset.selected = selected ?? '';
    canvas.dataset.twist = String(Math.round(twist * 100));
    if (!entered) { entered = true; canvas.dataset.ready = 'true'; }
    const moving = camera.position.distanceTo(goalCamera) > .002 || target.distanceTo(goalTarget) > .002 || unsettled || Math.abs(velocity) > .0005;
    canvas.dataset.settled = String(!moving && !pointer?.moved);
    if (moving || pointer?.moved) invalidate();
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
    const intersection = hit(event);
    // Keep the drag bound to the work under the initial press, even across other works.
    const hitId: string | null = intersection?.object.userData.exhibitId ?? null;
    if (mode === 'work' && !selected && !hitId) return;
    const rotate = getExhibit(selected ?? (mode === 'work' ? hitId : null))?.sculpture.group ?? null;
    let letter: THREE.Object3D | null = intersection?.object ?? null;
    while (letter && letter.userData.letterIndex === undefined) letter = letter.parent;
    if (selected !== 'type') letter = null;
    let planeStart: THREE.Vector3 | null = null;
    if (letter) {
      camera.getWorldDirection(direction);
      letter.getWorldPosition(dragPoint);
      dragPlane.setFromNormalAndCoplanarPoint(direction, dragPoint);
      planeStart = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
    }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), moved: false, yaw, pitch, hit: hitId, rotate, rotation: rotate?.rotation.clone() ?? null, twist, letter, letterStart: letter?.position.clone() ?? null, planeStart };
    velocity = 0;
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: globalThis.PointerEvent) {
    if (!pointer) {
      if (!fine || event.buttons !== 0) return;
      const next = hit(event)?.object.userData.exhibitId ?? null;
      if (hover !== next) { hover = next; canvas.style.cursor = next ? (mode === 'play' ? 'pointer' : 'grab') : ''; invalidate(); }
      return;
    }
    if (pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (event.pointerType === 'touch' && !pointer.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { resetPointer(); return; }
    if (!pointer.moved && Math.hypot(dx, dy) <= 7) return;
    pointer.moved = true;
    options.onInteract();
    canvas.classList.add('is-dragging');
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
      }
    } else if (selected === 'ribbon') {
      twist = clamp(pointer.twist + dx / width, 0, 1);
    } else if (pointer.rotate && pointer.rotation) {
      const g = pointer.rotate;
      g.rotation.y = pointer.rotation.y + dx * .012;
      g.rotation.x = clamp(pointer.rotation.x + (mobile ? 0 : dy * .008), -1.3, 1.3);
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
    if (click) options.onSelect(click);
    invalidate();
  }
  function leave() { if (!pointer) { hover = null; invalidate(); } }
  function keyDown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    if (mode === 'work' && !selected) return;
    event.preventDefault();
    resetPointer(); velocity = 0; options.onInteract();
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
  function visibility() {
    running = document.visibilityState !== 'hidden';
    if (!running) { cancelAnimationFrame(frame); frame = 0; resetPointer(); velocity = 0; }
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
  document.addEventListener('visibilitychange', visibility);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    setMode(next) {
      if (mode === next) return;
      mode = next; selected = null; hover = null; velocity = 0; resetPointer();
      yaw = -.06; pitch = .12;
      canvas.style.cursor = '';
      canvas.dataset.mode = next;
      updateLighting();
      invalidate();
    },
    focus(id) {
      if (selected === id) return;
      if (id && !selected) savedView = { yaw, pitch };
      selected = id; velocity = 0; resetPointer();
      if (!id) { yaw = savedView.yaw; pitch = savedView.pitch; }
      updateLighting();
      invalidate();
    },
    setTwist(value) { const next = clamp(value / 100, 0, 1); if (next !== twist) { twist = next; invalidate(); } },
    resetPlay() {
      twist = .35;
      type.sculpture.group.children.forEach((letter, index) => {
        const origin = letterOrigins[index];
        if (origin) { letter.position.copy(origin.position); letter.rotation.copy(origin.rotation); }
      });
      options.onTwist(35);
      delete canvas.dataset.letterPosition;
      invalidate();
    },
    moveLetter(index, direction) {
      const letter = type.sculpture.group.children[index];
      if (!letter) return;
      if (direction === 'left' || direction === 'right') letter.position.x = clamp(letter.position.x + (direction === 'left' ? -.25 : .25), -4, 4);
      else letter.position.y = clamp(letter.position.y + (direction === 'down' ? -.25 : .25), -2, 2);
      canvas.dataset.letterPosition = `${index}:${letter.position.x.toFixed(2)},${letter.position.y.toFixed(2)}`;
      invalidate();
    },
    setReduced(value) { reduced = value; if (value) velocity = 0; invalidate(); },
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); resetPointer(); observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel); canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('keydown', keyDown);
      exhibits.forEach((item) => item.sculpture.dispose());
      floorGeometry.dispose(); floorMaterial.dispose(); key.shadow.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
