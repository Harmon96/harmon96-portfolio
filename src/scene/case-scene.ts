import * as THREE from 'three';
import type { WorkKind } from '../content/spatial';
import { createSculpture } from './sculptures';

export type CaseScene = {
  dispose: () => void;
  setReducedMotion: (value: boolean) => void;
};

type CaseSceneOptions = {
  canvas: HTMLCanvasElement;
  kind: WorkKind;
  rotation: [number, number, number];
  reducedMotion: boolean;
  onError: () => void;
};

export function createCaseScene({ canvas, kind, rotation, reducedMotion, onError }: CaseSceneOptions): CaseScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeede6');
  const camera = new THREE.OrthographicCamera(-5, 5, 2, -2, .1, 30);
  camera.position.set(0, .35, 8);
  camera.lookAt(0, 0, 0);

  let sculpture: ReturnType<typeof createSculpture>;
  try {
    sculpture = createSculpture(kind);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  sculpture.update(0, 0, 0);
  const bounds = new THREE.Box3().setFromObject(sculpture.group);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  sculpture.group.position.sub(center);
  const object = new THREE.Group();
  object.add(sculpture.group);
  object.scale.setScalar(2.8 / Math.max(size.x, size.y, size.z, .001));
  object.rotation.set(...rotation);
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  scene.add(object);

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#a2a295', 2.5);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight('#fff8ee', 4.5);
  key.position.set(-3.5, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = .1;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = .035;
  key.shadow.bias = -.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#d7e0ff', 1.3);
  fill.position.set(4, 2, -3);
  scene.add(fill);

  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.ShadowMaterial({ color: '#555344', opacity: .16 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const base = new THREE.Vector2(rotation[0], rotation[1]);
  const current = base.clone();
  const target = base.clone();
  const rotatedBounds = new THREE.Box3();
  let height = 0;
  let width = 0;
  let frame = 0;
  let previousTime = 0;
  let disposed = false;
  let failed = false;
  let visible = true;
  let reduced = reducedMotion;
  let gesture: {
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    touch: boolean;
    moved: boolean;
  } | null = null;

  // Fit a sphere around the normalized sculpture, so dragging never clips its corners.
  object.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  let radius = 0;
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const positions = node.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
      radius = Math.max(radius, vertex.length());
    }
  });
  const verticalSpan = Math.max(3.3, radius * 2.1);

  const fail = () => {
    if (failed || disposed) return;
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    gesture = null;
    canvas.removeAttribute('data-dragging');
    dispose();
    onError();
  };

  const render = (time: number) => {
    frame = 0;
    if (disposed || failed || !visible || document.hidden) return;
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    const factor = reduced ? 1 : 1 - Math.exp(-elapsed / 45);
    current.lerp(target, factor);
    if (current.distanceToSquared(target) < .000001) current.copy(target);
    canvas.dataset.rotationX = current.x.toFixed(4);
    canvas.dataset.rotationY = current.y.toFixed(4);
    object.rotation.x = current.x;
    object.rotation.y = current.y;
    object.updateMatrixWorld(true);
    floor.position.y = rotatedBounds.setFromObject(object).min.y - .035;
    try {
      renderer.render(scene, camera);
    } catch {
      fail();
      return;
    }
    if (current.distanceToSquared(target) > .000001) frame = requestAnimationFrame(render);
  };

  const invalidate = () => {
    if (!frame && !disposed && !failed && visible && !document.hidden) {
      previousTime = 0;
      frame = requestAnimationFrame(render);
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    if (width === nextWidth && height === nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    const aspect = width / height;
    const span = Math.max(verticalSpan, verticalSpan / aspect);
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    invalidate();
  };

  const releaseGesture = () => {
    const pointer = gesture?.id;
    gesture = null;
    canvas.removeAttribute('data-dragging');
    if (pointer !== undefined && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  };

  const pointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || failed || gesture) return;
    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: target.x,
      y: target.y,
      touch: event.pointerType !== 'mouse',
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (gesture.touch && !gesture.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      releaseGesture();
      return;
    }
    if (!gesture.moved && Math.hypot(dx, gesture.touch ? 0 : dy) < 6) return;
    gesture.moved = true;
    target.y = gesture.y + dx * .008;
    if (!gesture.touch) target.x = THREE.MathUtils.clamp(gesture.x + dy * .006, -Math.PI / 2, Math.PI / 2);
    canvas.setAttribute('data-dragging', 'true');
    if (reduced) current.copy(target);
    invalidate();
  };

  const pointerEnd = (event: PointerEvent) => {
    if (gesture?.id === event.pointerId) releaseGesture();
  };

  const keyDown = (event: KeyboardEvent) => {
    const step = Math.PI / 12;
    if (event.key === 'ArrowLeft') target.y -= step;
    else if (event.key === 'ArrowRight') target.y += step;
    else if (event.key === 'ArrowUp') target.x = Math.max(-Math.PI / 2, target.x - step);
    else if (event.key === 'ArrowDown') target.x = Math.min(Math.PI / 2, target.x + step);
    else if (event.key === 'Home') target.copy(base);
    else return;
    event.preventDefault();
    if (reduced) current.copy(target);
    invalidate();
  };

  const contextLost = (event: Event) => {
    event.preventDefault();
    fail();
  };
  const visibilityChanged = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      releaseGesture();
    } else invalidate();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) invalidate();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      releaseGesture();
    }
  });
  intersectionObserver.observe(canvas);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', pointerEnd);
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibilityChanged);
  resize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    releaseGesture();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerEnd);
    canvas.removeEventListener('pointercancel', pointerEnd);
    canvas.removeEventListener('lostpointercapture', pointerEnd);
    canvas.removeEventListener('keydown', keyDown);
    canvas.removeEventListener('webglcontextlost', contextLost);
    document.removeEventListener('visibilitychange', visibilityChanged);
    sculpture.dispose();
    floorGeometry.dispose();
    floorMaterial.dispose();
    key.shadow.map?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    setReducedMotion(value) {
      reduced = value;
      if (value) current.copy(target);
      invalidate();
    },
    dispose,
  };
}
