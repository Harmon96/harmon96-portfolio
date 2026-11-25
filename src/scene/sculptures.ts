import * as THREE from 'three';
import type { ThemeId } from '../lib/theme';
import { applySurfaceShader } from './finishes';

export type SculptureKind = 'commerce' | 'logistics' | 'style' | 'reliability' | 'ribbon' | 'type';
export type Sculpture = {
  group: THREE.Group;
  parts: THREE.Object3D[];
  setTheme: (theme: ThemeId) => void;
  assemble: (theme: ThemeId, progress: number) => void;
  prepareExit: (camera: THREE.Camera) => void;
  disperse: (progress: number) => void;
  update: (time: number, hover: number, twist: number) => void;
  dispose: () => void;
};

function matte(color: THREE.ColorRepresentation, roughness = 0.69) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

/** Fit children rather than the public group, so callers own its transform. */
function fit(group: THREE.Group, size = 2.8) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const dimensions = box.getSize(new THREE.Vector3());
  const factor = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
  for (const child of group.children) {
    child.position.sub(center).multiplyScalar(factor);
    child.scale.multiplyScalar(factor);
  }
  group.updateMatrixWorld(true);
}

const pigments = {
  glass: ['#72d6e4', '#779af4', '#a1ede1', '#9182df'],
  clay: ['#c77554', '#e9a16c', '#b794bc', '#758e78'],
  minimal: ['#555951', '#a4a69a', '#c5c3b6', '#333935'],
  type: ['#b62c19', '#2c2520', '#bfa275', '#2c2520'],
  blueprint: ['#defbff', '#acdfff', '#fcba7d', '#a3f2ef'],
  retro: ['#3953bf', '#d7613e', '#a477d8', '#28896f'],
  collage: ['#b8484a', '#ea9a26', '#768050', '#428e98'],
  cinema: ['#e9b780', '#cc744d', '#b69bbc', '#729aa6'],
  organic: ['#5eaa93', '#dcaa89', '#adb96e', '#6d9bb0'],
};

function sculpture(kind: SculptureKind, group: THREE.Group, update: Sculpture['update'] = () => {}): Sculpture {
  let disposed = false;
  const parts = [...group.children];
  // Theme poses and motion live on the pivots. Children keep their own rotation and letter positions.
  const pivots = parts.map((part) => {
    const pivot = new THREE.Group();
    pivot.add(part);
    group.add(pivot);
    return pivot;
  });
  const exitOffsets = parts.map(() => new THREE.Vector3());
  const departurePose = pivots.map(pivot => ({
    position: pivot.position.clone(), rotation: pivot.rotation.clone(), scale: pivot.scale.clone(),
  }));
  const arrival = { value: 1 };
  const materialSlots: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[] = [];
  group.traverse((node) => {
    if (node instanceof THREE.Mesh) materialSlots.push({ mesh: node, original: node.material });
  });
  const finishes = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
  const workIndex = { commerce: 0, logistics: 1, ribbon: 1, style: 2, reliability: 3, type: 0 }[kind];
  function finish(original: THREE.Material) {
    let material = finishes.get(original);
    if (!material) {
      material = new THREE.MeshPhysicalMaterial();
      finishes.set(original, material);
    }
    return material;
  }
  function setTheme(theme: ThemeId) {
    if (theme === 'spatial') {
      for (const slot of materialSlots) slot.mesh.material = slot.original;
      return;
    }
    for (const slot of materialSlots) {
      slot.mesh.material = Array.isArray(slot.original) ? slot.original.map(finish) : finish(slot.original);
    }
    let index = 0;
    for (const material of finishes.values()) {
      const pigment = kind === 'type' ? index : kind === 'reliability' && index > 0 ? 0 : workIndex;
      material.color.set(pigments[theme][pigment]!);
      if (kind !== 'type' && index > 0) material.color.multiplyScalar(index % 2 ? 0.69 : 1.13);
      material.roughness = { glass: .13, clay: .95, minimal: .8, type: .8, blueprint: 1, retro: 1, collage: 1, cinema: .31, organic: .27 }[theme];
      material.clearcoat = theme === 'glass' || theme === 'organic' ? 1 : 0;
      material.clearcoatRoughness = 0.08;
      material.sheen = theme === 'clay' ? 0.6 : 0;
      material.sheenColor.copy(material.color);
      material.sheenRoughness = 0.9;
      material.metalness = theme === 'cinema' ? .48 : 0;
      material.flatShading = theme === 'retro' || theme === 'collage';
      material.toneMapped = theme !== 'blueprint' && theme !== 'retro' && theme !== 'collage';
      material.alphaHash = theme === 'type';
      material.transparent = theme === 'glass';
      material.opacity = theme === 'glass' ? 0.72 : 1;
      material.depthWrite = theme !== 'glass';
      applySurfaceShader(material, theme, arrival);
      material.needsUpdate = true;
      index++;
    }
  }
  return {
    group, parts, setTheme,
    prepareExit(camera) {
      // Compute destinations in camera space so even a small study beside the index clears its canvas.
      parts.forEach((part, index) => {
        const pivot = pivots[index]!;
        const pose = departurePose[index]!;
        pose.position.copy(pivot.position);
        pose.rotation.copy(pivot.rotation);
        pose.scale.copy(pivot.scale);
        const start = part.getWorldPosition(new THREE.Vector3()).project(camera);
        const centerAngle = Math.hypot(start.x, start.y) > 0.08 ? Math.atan2(start.y, start.x) : workIndex * 1.68;
        const angle = centerAngle + (index - (parts.length - 1) / 2) * 0.64;
        const end = start.clone();
        end.x += Math.cos(angle) * 3.2;
        end.y += Math.sin(angle) * 3.2;
        exitOffsets[index]!.copy(group.worldToLocal(end.unproject(camera))).sub(group.worldToLocal(start.unproject(camera)));
      });
    },
    disperse(progress) {
      pivots.forEach((pivot, index) => {
        const t = THREE.MathUtils.clamp(progress * 1.18 - index * 0.06, 0, 1) ** 1.6;
        const pose = departurePose[index]!;
        pivot.position.copy(pose.position).addScaledVector(exitOffsets[index]!, t);
        pivot.rotation.copy(pose.rotation);
        pivot.rotation.z += (index % 2 ? -0.52 : 0.46) * t;
        pivot.scale.copy(pose.scale).multiplyScalar(1 - 0.23 * t);
      });
    },
    assemble(theme, progress) {
      arrival.value = progress;
      if (theme === 'type') {
        // Opaque dots accumulate on the existing surface. This keeps its silhouette registered to the page.
        let layer = 0;
        for (const material of finishes.values()) {
          const ink = THREE.MathUtils.clamp(progress * 1.24 - layer++ * 0.075, 0, 1);
          material.opacity = Math.round(ink * 12) / 12;
        }
      }
      pivots.forEach((pivot, index) => {
        const t = THREE.MathUtils.clamp(progress * 1.25 - index * 0.08, 0, 1);
        pivot.position.set(0, 0, 0);
        pivot.rotation.set(0, 0, 0, 'XYZ');
        pivot.scale.setScalar(1);
        if (theme === 'blueprint') {
          pivot.rotation.set(Math.atan(1 / Math.sqrt(2)), -Math.PI / 4, 0, 'YXZ');
          return;
        }
        if (theme === 'collage') {
          // Thin paper casts a small physical shadow over the next sheet even at rest.
          const peel = (1 - t) ** 2;
          const side = (workIndex + index) % 2 ? -1 : 1;
          pivot.scale.z = .31;
          pivot.position.set(side * 1.9 * peel, (1.3 + index * .15) * peel, index * .075 + peel);
          pivot.rotation.set(.84 * peel, side * .68 * peel, side * (.075 + .68 * peel));
          return;
        }
        if (t === 1 || theme === 'type' || theme === 'minimal') return;

        const remaining = (1 - t) ** 2;
        if (theme === 'spatial') {
          // Each ring or shell approaches its socket from a distinct depth and azimuth.
          const angle = workIndex * 1.67 + index * 2.4;
          const near = (workIndex + index) % 2 === 0;
          pivot.position.set(Math.cos(angle) * 3.8 * remaining, Math.sin(angle) * 2.8 * remaining, (near ? 2.8 : -4) * remaining);
          pivot.rotation.set((near ? 0.8 : -0.7) * remaining, (index % 2 ? -1.1 : 1.3) * remaining, 0);
          pivot.scale.setScalar(1 + (near ? 0.39 : -0.54) * remaining);
        } else if (theme === 'glass') {
          // All panes follow the same slant, with the deeper layers meeting the front face last.
          const separation = 1.7 + index * 0.35;
          pivot.position.set(separation * remaining, separation * 0.65 * remaining, -(0.9 + index * 0.45) * remaining);
          pivot.rotation.set(0.20 * remaining, -0.96 * remaining, -0.14 * remaining);
        } else if (theme === 'clay') {
          // Accelerate to the floor first. Compression and the small rebound begin after contact.
          const fall = Math.min(t / 0.52, 1);
          const landing = THREE.MathUtils.clamp((t - 0.52) / 0.48, 0, 1);
          const squash = Math.sin(Math.PI * Math.min(landing / 0.27, 1)) * 0.25;
          const rebound = Math.sin(Math.PI * THREE.MathUtils.clamp((landing - 0.27) / 0.61, 0, 1)) * 0.36;
          const stretch = Math.sin(Math.PI * fall) * 0.06;
          pivot.position.y = (1 - fall * fall) * (2.2 + index * 0.18) - squash * 0.72 + rebound;
          pivot.scale.set(1 + squash - stretch / 2, 1 - squash + stretch, 1 + squash - stretch / 2);
        } else if (theme === 'retro') {
          // A window outline expands horizontally, then opens in discrete rows.
          const tick = Math.floor(t * 6) / 6;
          pivot.scale.set(Math.min(1, .12 + tick * 3), Math.max(.04, (tick - .24) / .76), .35 + .65 * tick);
        } else if (theme === 'cinema') {
          // Hold on a tight first frame, cut to a second angle and settle into the wide shot.
          const opening = t < .32;
          pivot.position.x = opening ? (workIndex % 2 ? -.32 : .32) : 0;
          pivot.position.z = opening ? .55 : -.22 * remaining;
          pivot.rotation.y = opening ? .32 : -.10 * remaining;
          pivot.scale.setScalar(opening ? 1.18 : 1 + remaining * .06);
        } else if (theme === 'organic') {
          const swell = Math.sin(t * 2.4 * Math.PI) * (1 - t) ** 2;
          pivot.position.y = -.85 * remaining + swell * .35;
          pivot.rotation.z = swell * .16;
          pivot.scale.set(1 - remaining * .23 + swell * .07, 1 - remaining * .5, 1 - remaining * .18);
        }
      });
    },
    update: (time, hover, twist) => {
      if (!disposed) update(time, THREE.MathUtils.clamp(hover, 0, 1), THREE.MathUtils.clamp(twist, 0, 1));
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      setTheme('spatial');
      finishes.forEach((material) => material.dispose());
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
        else materials.add(object.material);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

class SoftLoop extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly width: number, private readonly height: number, private readonly phase: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const angle = t * Math.PI * 2;
    // A hand-shaped, gently squared ellipse, rather than a default torus.
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    return target.set(
      Math.sign(x) * Math.pow(Math.abs(x), 0.82) * this.width,
      Math.sign(y) * Math.pow(Math.abs(y), 0.88) * this.height,
      Math.sin(angle * 2 + this.phase) * 0.085,
    );
  }
}

function commerce() {
  const group = new THREE.Group();
  const colors = [0x3159e3, 0x496aeb, 0x2446c0];
  const arrangements = [
    { width: 0.93, height: 0.92, radius: 0.205, position: [-0.26, 0.13, 0.05], rotation: [0.18, -0.35, -0.35] },
    { width: 0.79, height: 1.06, radius: 0.185, position: [0.30, -0.13, 0.02], rotation: [0.20, 1.21, 0.38] },
    { width: 0.69, height: 0.84, radius: 0.165, position: [0.05, 0.03, 0.30], rotation: [1.12, -0.25, 0.22] },
  ];
  const rings = arrangements.map((arrangement, index) => {
    const ring = mesh(
      new THREE.TubeGeometry(new SoftLoop(arrangement.width, arrangement.height, index * 0.8), 128, arrangement.radius, 20, true),
      matte(colors[index]!),
    );
    ring.position.fromArray(arrangement.position);
    ring.rotation.set(arrangement.rotation[0]!, arrangement.rotation[1]!, arrangement.rotation[2]!);
    group.add(ring);
    return ring;
  });
  fit(group);
  return sculpture('commerce', group, (_time, hover) => {
    rings.forEach((ring, index) => {
      const base = arrangements[index]!.rotation;
      ring.rotation.x = base[0]! + hover * (index === 2 ? 0.10 : -0.035);
      ring.rotation.y = base[1]! + hover * (index === 1 ? 0.10 : 0.025);
    });
  });
}


type SurfacePoint = (u: number, v: number, target: THREE.Vector3) => THREE.Vector3;

/** A closed solid shell around an authored surface, including its narrow cut edges. */
function solidSurface(initial: SurfacePoint, uSegments: number, vSegments: number, thickness: number, closedU = false) {
  const row = vSegments + 1;
  const count = (uSegments + 1) * row;
  const positions = new Float32Array(count * 2 * 3);
  const indices: number[] = [];
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const a = i * row + j;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const frontCount = indices.length;
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const a = count + i * row + j;
      const b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const backCount = indices.length - frontCount;
  for (let i = 0; i < uSegments; i++) {
    const a = i * row;
    const b = a + row;
    indices.push(a, a + count, b, b, a + count, b + count);
    const c = a + vSegments;
    const d = b + vSegments;
    indices.push(c, d, c + count, d, d + count, c + count);
  }
  if (!closedU) {
    for (let j = 0; j < vSegments; j++) {
      indices.push(j, j + 1, j + count, j + 1, j + 1 + count, j + count);
      const a = uSegments * row + j;
      indices.push(a, a + count, a + 1, a + 1, a + count, a + 1 + count);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  geometry.addGroup(0, frontCount, 0);
  geometry.addGroup(frontCount, backCount, 1);
  geometry.addGroup(frontCount + backCount, indices.length - frontCount - backCount, 1);
  const p = new THREE.Vector3();
  const du = new THREE.Vector3();
  const dv = new THREE.Vector3();
  const low = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const epsilon = 0.0001;
  function write(sample: SurfacePoint) {
    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments;
      const uLow = closedU ? (u - epsilon + 1) % 1 : Math.max(0, u - epsilon);
      const uHigh = closedU ? (u + epsilon) % 1 : Math.min(1, u + epsilon);
      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        sample(u, v, p);
        sample(uHigh, v, du).sub(sample(uLow, v, low));
        sample(u, Math.min(1, v + epsilon), dv).sub(sample(u, Math.max(0, v - epsilon), low));
        normal.crossVectors(du, dv).normalize().multiplyScalar(thickness / 2);
        const index = i * row + j;
        for (let side = 0; side < 2; side++) {
          const offset = (index + side * count) * 3;
          const direction = side === 0 ? 1 : -1;
          positions[offset] = p.x + normal.x * direction;
          positions[offset + 1] = p.y + normal.y * direction;
          positions[offset + 2] = p.z + normal.z * direction;
        }
      }
    }
    geometry.attributes.position!.needsUpdate = true;
    geometry.computeVertexNormals();
    if (closedU) {
      const normals = geometry.getAttribute('normal');
      for (let side = 0; side < 2; side++) {
        for (let j = 0; j <= vSegments; j++) {
          const first = side * count + j;
          const last = first + uSegments * row;
          normal.fromBufferAttribute(normals, first);
          low.fromBufferAttribute(normals, last);
          normal.add(low).normalize();
          normals.setXYZ(first, normal.x, normal.y, normal.z);
          normals.setXYZ(last, normal.x, normal.y, normal.z);
        }
      }
      normals.needsUpdate = true;
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  write(initial);
  return { geometry, write };
}

function ribbonSurface(twist: number): SurfacePoint {
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const reference = new THREE.Vector3();
  return (u, v, target) => {
    const angle = -2.25 + u * 5.7;
    const x = 1.03 * Math.cos(angle) + 0.13 * Math.cos(angle * 2);
    const y = 0.96 * Math.sin(angle);
    const z = 0.38 * Math.sin(angle * 2);
    tangent.set(-1.03 * Math.sin(angle) - 0.26 * Math.sin(angle * 2), 0.96 * Math.cos(angle), 0.76 * Math.cos(angle * 2)).normalize();
    reference.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 1);
    side.copy(reference).addScaledVector(tangent, -reference.dot(tangent)).normalize();
    side.applyAxisAngle(tangent, 0.25 + Math.sin(angle) * 0.72 + Math.sin(angle * 2) * twist * 1.18);
    const width = 0.69 + 0.08 * Math.cos(angle * 3);
    return target.set(x, y, z).addScaledVector(side, (v - 0.5) * width);
  };
}

function ribbon(experiment: boolean) {
  const group = new THREE.Group();
  let lastTwist = experiment ? 0 : 0.34;
  const surface = solidSurface(ribbonSurface(lastTwist), 128, 6, 0.085);
  const band = mesh(surface.geometry, [matte(0xe8753c, 0.72), matte(0xc75b2d, 0.76)]);
  band.rotation.set(0.16, -0.22, -0.34);
  group.add(band);
  fit(group);
  return sculpture(experiment ? 'ribbon' : 'logistics', group, (_time, hover, twist) => {
    const requested = experiment ? twist : 0.34;
    if (Math.abs(requested - lastTwist) > 0.0001) {
      surface.write(ribbonSurface(requested));
      lastTwist = requested;
    }
    band.rotation.y = -0.22 + hover * 0.10;
  });
}

function style() {
  const group = new THREE.Group();
  const sample: SurfacePoint = (u, v, target) => {
    const angle = -u * Math.PI * 2;
    const inner = 0.20;
    const outer = 1.16 + Math.cos(angle * 5) * 0.055;
    const radius = inner + v * (outer - inner);
    const pleat = Math.cos(angle * 22) * (0.055 + v * 0.105);
    return target.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 1.06,
      pleat + Math.sin(angle) * 0.09 + Math.sin(angle * 2) * v * 0.08,
    );
  };
  const surface = solidSurface(sample, 264, 12, 0.055, true);
  const fan = mesh(surface.geometry, [matte(0xe6dfc9, 0.77), matte(0x41443d, 0.73)]);
  fan.rotation.set(-0.22, 0.28, 0.12);
  group.add(fan);
  fit(group);
  return sculpture('style', group, (_time, hover) => {
    fan.rotation.z = 0.12 + hover * 0.08;
    fan.rotation.y = 0.28 - hover * 0.10;
  });
}

function reliability() {
  const group = new THREE.Group();
  const outer = matte(0x32383b, 0.65);
  const inner = matte(0x345bdf, 0.67);
  const sections: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index++) {
    const start = index * Math.PI * 2 / 3 + 0.14;
    const length = Math.PI * 2 / 3 - 0.28;
    const sample: SurfacePoint = (u, v, target) => {
      const phi = start + u * length;
      const theta = 0.20 + v * (Math.PI - 0.40);
      // Front normals face outward for the shell, with blue showing inside the cuts.
      return target.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
    };
    const surface = solidSurface(sample, 48, 48, 0.15);
    const shell = mesh(surface.geometry, [outer, inner]);
    const middle = start + length / 2;
    shell.position.set(Math.cos(middle) * 0.10, index === 1 ? 0.025 : -0.012, Math.sin(middle) * 0.10);
    shell.rotation.z = (index - 1) * 0.055;
    group.add(shell);
    sections.push(shell);
  }
  const core = mesh(new THREE.IcosahedronGeometry(0.49, 3), matte(0x325ae2, 0.7));
  core.rotation.set(0.2, 0.4, 0.1);
  group.add(core);
  group.rotation.set(-0.08, 0.40, -0.15);
  // Bake the authored overall orientation before normalizing public transforms.
  const rotation = new THREE.Matrix4().makeRotationFromEuler(group.rotation);
  group.rotation.set(0, 0, 0);
  group.children.forEach((child) => child.applyMatrix4(rotation));
  fit(group);
  const positions = sections.map((section) => section.position.clone());
  return sculpture('reliability', group, (_time, hover) => {
    sections.forEach((section, index) => section.position.copy(positions[index]!).multiplyScalar(1 + hover * 0.19));
  });
}

function letterShape(letter: string) {
  const shape = new THREE.Shape();
  if (letter === 'P') {
    shape.moveTo(0, 0); shape.lineTo(0, 1.5); shape.lineTo(0.62, 1.5);
    shape.quadraticCurveTo(1.03, 1.5, 1.03, 1.10); shape.lineTo(1.03, 0.94);
    shape.quadraticCurveTo(1.03, 0.59, 0.65, 0.59); shape.lineTo(0.31, 0.59); shape.lineTo(0.31, 0); shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0.31, 0.88); hole.lineTo(0.58, 0.88);
    hole.quadraticCurveTo(0.72, 0.88, 0.72, 1.02); hole.lineTo(0.72, 1.08);
    hole.quadraticCurveTo(0.72, 1.21, 0.58, 1.21); hole.lineTo(0.31, 1.21); hole.closePath();
    shape.holes.push(hole);
  } else if (letter === 'L') {
    shape.moveTo(0, 0); shape.lineTo(0.95, 0); shape.lineTo(0.95, 0.31);
    shape.lineTo(0.32, 0.31); shape.lineTo(0.32, 1.5); shape.lineTo(0, 1.5); shape.closePath();
  } else if (letter === 'A') {
    shape.moveTo(0, 0); shape.lineTo(0.41, 1.5); shape.lineTo(0.75, 1.5); shape.lineTo(1.16, 0);
    shape.lineTo(0.82, 0); shape.lineTo(0.74, 0.33); shape.lineTo(0.42, 0.33); shape.lineTo(0.34, 0); shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0.48, 0.61); hole.lineTo(0.68, 0.61); hole.lineTo(0.58, 1.02); hole.closePath();
    shape.holes.push(hole);
  } else {
    shape.moveTo(0, 1.5); shape.lineTo(0.35, 1.5); shape.lineTo(0.59, 0.96);
    shape.lineTo(0.84, 1.5); shape.lineTo(1.19, 1.5); shape.lineTo(0.76, 0.61);
    shape.lineTo(0.76, 0); shape.lineTo(0.43, 0); shape.lineTo(0.43, 0.61); shape.closePath();
  }
  return shape;
}

function typography() {
  const group = new THREE.Group();
  const colors = [0x365de0, 0xe7783e, 0xe7dfc9, 0x3b403e];
  const rotations = [-0.11, 0.035, -0.045, 0.09];
  const depths = [0.08, -0.08, 0.10, -0.025];
  ['P', 'L', 'A', 'Y'].forEach((letter, index) => {
    const letterGroup = new THREE.Group();
    letterGroup.name = `letter-${letter}`;
    letterGroup.userData.letterIndex = index;
    letterGroup.userData.letter = letter;
    const geometry = new THREE.ExtrudeGeometry(letterShape(letter), {
      depth: 0.27, steps: 1, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 4, curveSegments: 16,
    });
    geometry.center();
    const letterMesh = mesh(geometry, matte(colors[index]!, index === 2 ? 0.78 : 0.69));
    letterGroup.add(letterMesh);
    letterGroup.position.set((index - 1.5) * 1.27, index === 1 ? -0.08 : index === 2 ? 0.035 : 0, depths[index]!);
    letterGroup.rotation.set(0.025, (index - 1.5) * 0.035, rotations[index]!);
    group.add(letterGroup);
  });
  fit(group, 5);
  // Letter transforms belong to the caller after creation (individual dragging).
  return sculpture('type', group);
}

export function createSculpture(kind: SculptureKind): Sculpture {
  switch (kind) {
    case 'commerce': return commerce();
    case 'logistics': return ribbon(false);
    case 'style': return style();
    case 'reliability': return reliability();
    case 'ribbon': return ribbon(true);
    case 'type': return typography();
  }
}
