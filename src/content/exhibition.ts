export type ArtworkKind = 'commerce' | 'logistics' | 'style' | 'reliability';

export const exhibition: Record<string, { kind: ArtworkKind; caption: string; medium: string }> = {
  '1688-direct-purchase': {
    kind: 'commerce',
    caption: '상품을 고르고, 주문하기까지',
    medium: 'COMMERCE',
  },
  'delivery-logistics': {
    kind: 'logistics',
    caption: '서로 다른 조건을 하나의 흐름으로',
    medium: 'LOGISTICS',
  },
  'style-label': {
    kind: 'style',
    caption: '발견에서 구매로 이어지는 화면',
    medium: 'PRODUCT EXPERIENCE',
  },
  'frontend-reliability': {
    kind: 'reliability',
    caption: '문제를 찾고, 다시 확인하는 일',
    medium: 'RELIABILITY',
  },
};
