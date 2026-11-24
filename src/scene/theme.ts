import * as THREE from 'three';
import { isThemeId, type ThemeId } from '../lib/theme';
import { sceneEntranceDuration } from '../lib/themeTransition';

const studio = {
  glass: { key: '#e9ffff', fill: '#7eb9ff', sky: '#e6fbff', ground: '#6394a8', shadow: '#527d99' },
  clay: { key: '#fff0d8', fill: '#f4b9ab', sky: '#fff1dd', ground: '#c38472', shadow: '#85594e' },
  minimal: { key: '#fffef9', fill: '#d9dcd9', sky: '#fafaf7', ground: '#aeaea8', shadow: '#999993' },
  type: { key: '#ffedd1', fill: '#e6cbbc', sky: '#fdf6e1', ground: '#9f8875', shadow: '#45382f' },
  blueprint: { key: '#f0fbff', fill: '#9df0ff', sky: '#a2ccdf', ground: '#203c5a', shadow: '#102c50' },
  retro: { key: '#fff2d6', fill: '#cdb7ff', sky: '#dce9ea', ground: '#738293', shadow: '#294b4b' },
  collage: { key: '#fff3dd', fill: '#dfc9b4', sky: '#fff4e8', ground: '#a88571', shadow: '#675440' },
  cinema: { key: '#ffc994', fill: '#9cbffd', sky: '#afa4b6', ground: '#51424e', shadow: '#130f19' },
  organic: { key: '#fff6d9', fill: '#b6e8e3', sky: '#e9f4d4', ground: '#6f9f87', shadow: '#4d8069' },
};

export function configureRenderer(renderer: THREE.WebGLRenderer, theme: ThemeId, normalRatio: number) {
  // Pixel art uses the real silhouette and hit targets; only its backing buffer is coarser.
  const ratio = theme === 'retro' ? .36 : normalRatio;
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  // The line, pixel and paper shaders use their own ink. They need no shadow pass.
  renderer.shadowMap.enabled = theme !== 'blueprint' && theme !== 'retro' && theme !== 'collage';
}

export function assemblyProgress(theme: ThemeId, start: number, now: number) {
  const duration = sceneEntranceDuration[theme];
  return THREE.MathUtils.clamp((now - start) / duration, 0, 1);
}

export function sceneInView(canvas: HTMLCanvasElement) {
  if (document.hidden) return false;
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight &&
    rect.right > 0 && rect.left < innerWidth;
}

export function observeSceneTheme(
  canvas: HTMLCanvasElement,
  apply: (theme: ThemeId, animate: boolean) => void,
  exit: (duration: number) => void,
  cancelExit: () => void,
) {
  let signal: AbortSignal | undefined;
  function detach() {
    signal?.removeEventListener('abort', abort);
    signal = undefined;
  }
  function abort() {
    detach();
    cancelExit();
  }
  const depart = (event: Event) => {
    const detail = (event as CustomEvent<{ duration: number; signal: AbortSignal }>).detail;
    if (detail.signal.aborted || detail.duration <= 0 || !sceneInView(canvas)) return;
    detach();
    signal = detail.signal;
    signal.addEventListener('abort', abort, { once: true });
    exit(detail.duration);
  };
  function update(value: string | undefined, animate: boolean) {
    const theme = isThemeId(value) ? value : 'spatial';
    canvas.dataset.sceneTheme = theme;
    apply(theme, animate && sceneInView(canvas));
  }
  const change = (event: Event) => {
    const detail = (event as CustomEvent<{ theme: ThemeId; animate: boolean }>).detail;
    // A pagehide or explicit cancellation can also interrupt the incoming pieces.
    if (!detail.animate) detach();
    update(detail.theme, detail.animate);
  };
  update(document.documentElement.dataset.theme, false);
  window.addEventListener('portfolio:themechange', change);
  window.addEventListener('portfolio:themeexit', depart);
  return () => {
    detach();
    window.removeEventListener('portfolio:themechange', change);
    window.removeEventListener('portfolio:themeexit', depart);
  };
}

export function studioLighting(
  key: THREE.DirectionalLight, fill: THREE.DirectionalLight, hemisphere: THREE.HemisphereLight,
  shadow: THREE.ShadowMaterial,
) {
  const original = {
    key: key.color.getHex(), fill: fill.color.getHex(), sky: hemisphere.color.getHex(),
    ground: hemisphere.groundColor.getHex(), shadow: shadow.color.getHex(),
    fillPower: fill.intensity, skyPower: hemisphere.intensity, shadowOpacity: shadow.opacity,
  };
  return (theme: ThemeId) => {
    const colors = theme === 'spatial' ? original : studio[theme];
    key.color.set(colors.key);
    fill.color.set(colors.fill);
    hemisphere.color.set(colors.sky);
    hemisphere.groundColor.set(colors.ground);
    shadow.color.set(colors.shadow);
    fill.intensity = original.fillPower * (theme === 'cinema' ? 2.65 : 1);
    hemisphere.intensity = original.skyPower * (theme === 'cinema' ? .37 : 1);
    // These objects sit on a drawn sheet, a desktop or an individual paper card.
    shadow.opacity = theme === 'blueprint' || theme === 'retro' || theme === 'collage' || theme === 'cinema'
      ? 0 : theme === 'organic' ? original.shadowOpacity * .35 : original.shadowOpacity;
  };
}
