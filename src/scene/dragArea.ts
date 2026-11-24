import * as THREE from 'three';

export type DragArea = { x: number; y: number; radius: number; visible: boolean };
export type GuideState = 'idle' | 'hover' | 'drag' | 'focus';

export function newDragArea(): DragArea {
  return { x: 0, y: 0, radius: 0, visible: false };
}

const projected = new THREE.Vector3();
export const dragPadding = (coarse: boolean) => coarse ? 20 : 14;

export function projectDragArea(
  area: DragArea, center: THREE.Vector3, worldRadius: number,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  width: number, height: number, coarse: boolean,
) {
  projected.copy(center).applyMatrix4(camera.matrixWorldInverse);
  const depth = camera instanceof THREE.PerspectiveCamera ? -projected.z : 1;
  const pixelsPerUnit = height * camera.projectionMatrix.elements[5] / (2 * Math.max(.001, depth));
  projected.applyMatrix4(camera.projectionMatrix);
  area.x = (projected.x + 1) * width / 2;
  area.y = (1 - projected.y) * height / 2;
  area.radius = Math.max(coarse ? 40 : 32, worldRadius * pixelsPerUnit + dragPadding(coarse));
  area.visible = depth > 0 && Math.abs(projected.z) <= 1 && area.x + area.radius > 0 &&
    area.x - area.radius < width && area.y + area.radius > 0 && area.y - area.radius < height;
}

export function drawGuide(guide: HTMLElement, area: DragArea, state: GuideState, angle = 0) {
  const hidden = !area.visible;
  if (guide.hidden !== hidden) guide.hidden = hidden;
  if (!area.visible) return;
  guide.style.left = area.x.toFixed(2) + 'px';
  guide.style.top = area.y.toFixed(2) + 'px';
  guide.style.width = guide.style.height = (2 * area.radius).toFixed(2) + 'px';
  if (guide.dataset.state !== state) guide.dataset.state = state;
  guide.style.setProperty('--drag-turn', (angle * 180 / Math.PI).toFixed(1) + 'deg');
}

// A short stroke is enough to inspect a small model; large close-ups stay controllable.
export function dragRadians(pixels: number, radius: number) {
  return pixels * THREE.MathUtils.clamp(1.45 / Math.max(radius, 1), .006, .023);
}
