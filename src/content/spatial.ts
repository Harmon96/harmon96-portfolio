export type WorkKind = 'commerce' | 'logistics' | 'style' | 'reliability';

export const spatialWorks: {
  slug: string;
  kind: WorkKind;
  shortName: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}[] = [
  { slug: '1688-direct-purchase', kind: 'commerce', shortName: 'Commerce', color: '#3156ff', position: [-2.3, .65, .8], rotation: [.25, -.35, -.2], scale: .94 },
  { slug: 'delivery-logistics', kind: 'logistics', shortName: 'Delivery', color: '#f05a2a', position: [2.15, .95, -.5], rotation: [-.15, .4, .1], scale: 1 },
  { slug: 'style-label', kind: 'style', shortName: 'Style', color: '#d8cfb8', position: [-1.15, -1.9, -.9], rotation: [.25, -.25, -.25], scale: .83 },
  { slug: 'frontend-reliability', kind: 'reliability', shortName: 'Quality', color: '#242827', position: [2.35, -1.5, .65], rotation: [.15, .25, .15], scale: .85 },
];
