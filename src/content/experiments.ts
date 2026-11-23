export const experiments = [
  {
    id: 'cube',
    number: '01',
    title: '돌려보는 글자',
    description: '같은 블록도, 어느 면을 보느냐에 따라 달라집니다.',
  },
  {
    id: 'poster',
    number: '02',
    title: '접히는 포스터',
    description: '종이 한 장을 접고 펼치는 작은 움직임.',
  },
] as const;

export const cubeFaces = [
  { side: 'front', text: 'Aa' },
  { side: 'right', text: '가' },
  { side: 'back', text: '01' },
  { side: 'left', text: '&' },
  { side: 'top', text: '{ }' },
  { side: 'bottom', text: '*' },
] as const;
