import { allProjects, smartGrid } from './portfolio';

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
  { slug: '1688-direct-purchase', kind: 'commerce', shortName: '직접구매', color: '#3156ff', position: [-3.1, 1.65, .35], rotation: [.25, -.35, -.2], scale: .94 },
  { slug: 'delivery-logistics', kind: 'logistics', shortName: '배송·물류', color: '#f05a2a', position: [2.95, 1.5, -.35], rotation: [-.15, .4, .1], scale: 1 },
  { slug: 'style-label', kind: 'style', shortName: '의류 사입', color: '#d8cfb8', position: [-2.35, -.95, -.4], rotation: [.25, -.25, -.25], scale: .83 },
  { slug: smartGrid.slug, kind: 'reliability', shortName: smartGrid.name, color: '#242827', position: [2.35, -1.05, .3], rotation: [.15, .25, .15], scale: .85 },
];

export const playgroundProjects = spatialWorks.map(({ slug }) => {
  const project = allProjects.find(item => item.slug === slug);
  if (!project) throw new Error(`Missing Playground project: ${slug}`);
  return project;
});
