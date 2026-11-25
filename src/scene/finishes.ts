import * as THREE from 'three';
import type { ThemeId } from '../lib/theme';

// Coordinates travel with the mesh, including the ribbon when the visitor twists it.
const drafting = `
  float station = clamp(.5 + .25 * (surfacePoint.x + surfacePoint.y * .4), .001, .999);
  if (station > arrival) discard;
  vec2 grid = vec2(surfacePoint.x + .55 * surfacePoint.z, surfacePoint.y - .35 * surfacePoint.z) * 4.;
  vec2 distanceToLine = abs(fract(grid + .5) - .5) / max(fwidth(grid), vec2(.001));
  float crossSection = 1. - smoothstep(.28, 1.05, min(distanceToLine.x, distanceToLine.y));
  float facing = abs(dot(normal, normalize(vViewPosition)));
  float edge = 1. - smoothstep(.12, .34, facing);
  outgoingLight = mix(vec3(.012, .048, .104), diffuseColor.rgb, max(edge, crossSection * .69));
`;
const indexedColor = `
  float keyLight = dot(normal, normalize(vec3(-.5, .78, .6)));
  float band = keyLight > .61 ? 1. : keyLight > .06 ? .65 : .32;
  outgoingLight = diffuseColor.rgb * band + vec3(.014, .017, .028);
`;
const printedPaper = `
  float light = smoothstep(-.16, .8, dot(normal, normalize(vec3(-.5, .6, .7))));
  vec2 printGrid = surfacePoint.xy * 32.;
  vec2 dotCenter = fract(printGrid) - .5;
  float feather = max(.05, length(fwidth(printGrid)) * .45);
  float dots = 1. - smoothstep(.2 - feather, .2 + feather, length(dotCenter));
  outgoingLight = diffuseColor.rgb * mix(.70, 1.08, light) * (1. - dots * (1. - light) * .36);
`;
const ripple = `
  float radius = length(surfacePoint.xy);
  float crest = 1. - smoothstep(0., .23, abs(radius - arrival * 2.25));
  outgoingLight += vec3(.20, .49, .36) * crest * sin(arrival * 3.14159);
`;

const surfaces: Partial<Record<ThemeId, string>> = { blueprint: drafting, retro: indexedColor, collage: printedPaper, organic: ripple };

export function applySurfaceShader(material: THREE.MeshPhysicalMaterial, theme: ThemeId, arrival: { value: number }) {
  const surface = surfaces[theme] ?? '';
  material.customProgramCacheKey = () => surface ? theme : '';
  material.onBeforeCompile = surface ? shader => {
    shader.uniforms.arrival = arrival;
    shader.vertexShader = 'varying vec3 surfacePoint;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n surfacePoint = transformed;');
    shader.fragmentShader = 'varying vec3 surfacePoint; uniform float arrival;\n' + shader.fragmentShader
      .replace('#include <opaque_fragment>', surface + '\n#include <opaque_fragment>');
  } : THREE.Material.prototype.onBeforeCompile;
}
