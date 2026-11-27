export type Project = {
  slug: string;
  number: string;
  name: string;
  description: string;
  role: string;
  questions: string[];
  homeSummary?: string;
  details?: {
    milestone: string;
    implementation: string[];
    followUp: string;
  };
};

export const profile = {
  name: '임재혁',
  role: '프론트엔드 개발자',
  links: [
    { label: 'GitHub', href: 'https://github.com/Harmon96' },
    { label: 'Velog', href: 'https://velog.io/@harmon/posts' },
    { label: '이메일', href: 'mailto:jaehyeok1584@gmail.com' },
  ],
  careers: [
    {
      company: 'Super-Label',
      period: '2024.10 입사',
      role: 'Frontend Engineer',
      description: [
        '해외 상품 직접구매 플랫폼의 프론트엔드를 맡았습니다.',
        '1688 직접구매 플랫폼에서 상품 등록부터 출고 신청 A to Z 모든 부분을, 의류 사입 서비스에서는 상품 탐색부터 주문·결제까지 구현했습니다.',
      ],
    },
    {
      company: 'EIPGRID',
      period: '2021.12 — 2024.10',
      role: 'Frontend Engineer',
      description: [
        '에너지 서비스의 대시보드와 전력 설비 단선결선도를 개발했습니다. 단선결선도에 쓸 라이브러리를 비교해 JointJS를 골랐고, 전달받은 설비 기호와 연결 데이터를 화면에 그렸습니다.',
        '스마트그리드 관련 페이지의 차트, 데이터표시 등을 작업하였습니다.',
        '개발 환경 속도를 높이기 위해 Webpack에서 Vite로 변경하였습니다.',
      ],
    },
  ],
};

export const projects: Project[] = [
  {
    slug: '1688-direct-purchase',
    number: '01',
    name: '해외 상품 직접구매',
    homeSummary: '직접구매 서비스의 상세 기획을 맡고 프론트엔드 전체를 혼자 구현했습니다.',
    description: '상품 링크를 붙여 넣고 옵션을 골라 주문하는 서비스입니다. 구매 화면을 기획하고 프론트엔드를 개발했습니다.',
    role: '상세 기획 · FE 설계와 구현 · 출시 후 운영',
    questions: ['다음 화면에 어떤 값을 넘겨야 할까?', '달러로 얼마를 충전해야 할까?'],
    details: {
      milestone: '2025년 2월 서비스 공개',
      implementation: [
        '초기 기본 구조를 바탕으로 상세 기획과 추가 개발환경과 아키텍처 선정 등을 맡고 프론트엔드 전체를 구현했습니다.',
        '상품 상세의 옵션과 수량, 데이터를 관리하기 위해 Zustand 상태관리를 사용하였고, 환율과 기타 계산 과정에서의 정확도를위해 Big.js를 사용하였습니다.',
      ],
      followUp: '출시 후에는 외부 인증이 만료되거나 상품 조회에 실패했을 때 로딩이 끝나도록 수정했습니다.',
    },
  },
  {
    slug: 'delivery-logistics',
    number: '02',
    name: '배송·물류 신청 서비스',
    homeSummary: '상품 등록, 배송 유형 분류, 출고 신청 화면 등 대부분의 FE 화면을 구현했습니다.',
    description: '상품 등록부터 출고 신청까지 대부분의 화면을 구현했습니다. 배송 유형을 바꿀 때는 같은 트래킹번호의 상품을 함께 옮기도록 했습니다.',
    role: '등록·분류·출고 화면 구현 · 상품 이동 규칙 설계',
    questions: ['상품 하나를 끌었을 때 무엇을 함께 옮길까?', '묶음 안에 이동할 수 없는 상품이 있으면 어떻게 할까?'],
  },
  {
    slug: 'frontend-reliability',
    number: '03',
    name: '확장 프로그램 로그인 오류',
    description: '확장 프로그램이 5초 안에 응답하지 않으면 안내를 띄우고 홈으로 돌아가도록 고쳤습니다.',
    role: '로그인 예외 처리 · Sentry 오류 분류 · 회귀 검증',
    questions: ['웹에서 확장 프로그램을 얼마나 기다릴까?', '대기가 끝난 뒤 도착한 응답은 어떻게 다룰까?'],
  },
  {
    slug: 'style-label',
    number: '04',
    name: '의류 사입 커머스',
    homeSummary: '상품·스토어 검색과 주문·결제 화면을 구현했습니다.',
    description: '2025년 초기 구축과 2026년 재구축에 참여해 상품·스토어 검색부터 주문·결제 화면까지 만들었습니다.',
    role: '상품·스토어 탐색과 주문·결제 UI 개발',
    questions: [],
  },
];

export const smartGrid: Project = {
  slug: 'smart-grid',
  number: '05',
  name: '스마트 그리드',
  description: 'EIPGRID에서 도시형 스마트 그리드 홈페이지의 전체 페이지와 차트를 개발했습니다. Vue 3와 Pinia, Vite를 사용했습니다.',
  role: '페이지 구현 · 차트 개발',
  questions: [],
};

export const allProjects = [...projects, smartGrid];
export const homeProjects = projects.filter((project) => project.homeSummary);
