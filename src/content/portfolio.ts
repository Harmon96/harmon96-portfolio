import { deliveryFlow, loginFlow, purchaseFlow, type DecisionFlow } from './interactions';

export type PublicLink = { label: string; href: string };
type CaseSection = {
  id: 'context' | 'implementation' | 'result';
  title: string;
  paragraphs: string[];
};

type ProjectInfo = {
  slug: string;
  number: string;
  name: string;
  title: string;
  description: string;
  role: string;
  questions: string[];
};

export type CaseStudy = ProjectInfo & {
  kind: 'case';
  lead: string;
  milestone: string;
  flow: DecisionFlow;
  sections: CaseSection[];
};

export type Project = CaseStudy | (ProjectInfo & { kind: 'note'; note: string });

export const profile = {
  name: '임재혁',
  handle: 'Harmon',
  role: 'Product Engineer & Creative Developer',
  introduction:
    '큰 디자인 틀에서 세부 동작을 정하고, 프론트엔드 구현과 출시 후 운영까지 맡아 왔습니다. 구매·물류의 상태와 예외를 정리하고, 오류가 생기면 사용자 행동과 코드에서 원인을 좁힙니다.',
  links: [
    { label: 'GitHub', href: 'https://github.com/Harmon96' },
    { label: 'Velog', href: 'https://velog.io/@harmon/posts' },
    { label: '이메일', href: 'mailto:jaehyeok1584@gmail.com' },
  ] satisfies PublicLink[],
  careers: [
    {
      company: 'Super-Label',
      period: '2024.10 입사',
      role: 'Frontend Engineer',
      description:
        '해외 상품 직접구매 플랫폼의 프론트엔드를 맡았습니다. 배송·물류 신청 서비스를 만들고 의류 사입 커머스의 상품 탐색과 주문·결제 화면을 개발했습니다.',
    },
    {
      company: 'EIPGRID',
      period: '2021.12 — 2024.10',
      role: 'Frontend Engineer',
      description:
        '에너지 서비스의 대시보드와 전력 설비 단선결선도 화면을 개발했습니다. JointJS를 비교·선정하고, 제공받은 설비 기호와 연결 데이터를 그리는 화면을 혼자 구현했습니다. 개발 환경의 속도를 개선하려고 Webpack에서 Vite로 전환을 제안하고 다른 개발자와 나눠 진행했습니다.',
    },
  ],
};

export const workingPrinciples = [
  {
    title: '정책을 화면의 동작으로 옮깁니다',
    text: '배송·물류 화면에서는 같은 트래킹번호의 상품을 함께 옮기는 조건과 이동을 막을 조건을 구체화했습니다. 화면에 보이는 한 행과 실제 처리해야 할 묶음을 구분합니다.',
  },
  {
    title: '문제에 맞는 기술을 선택합니다',
    text: '구매 단계를 오가는 상태에는 Zustand를, 환율과 소수 금액 계산에는 big.js를 사용했습니다. 전력 설비의 연결 관계를 그리는 화면에서는 JointJS를 비교·선정했습니다.',
  },
  {
    title: '실패하는 조건까지 확인합니다',
    text: '확장 프로그램의 로그인 응답이 오지 않거나 뒤늦게 오는 조건을 테스트했습니다. 코드 수정, 테스트 통과, 배포 후 운영 확인을 구분하고 아직 확인하지 못한 조건도 남깁니다.',
  },
];

export const projects: Project[] = [
  {
    slug: '1688-direct-purchase',
    number: '01',
    name: '해외 상품 직접구매 플랫폼',
    kind: 'case',
    title: '해외 상품 옵션 선택과\n달러 충전',
    description: '해외 상품의 옵션을 고르고 달러를 충전해 주문하는 서비스입니다.',
    lead: '선택한 옵션과 수량은 Zustand로 다음 화면까지 이어가고, 위안화 가격을 달러 충전액으로 바꾸는 계산에는 big.js를 썼습니다.',
    role: '상세 기획 · FE 설계와 구현 · 출시 후 운영',
    milestone: '2025년 2월 서비스 공개',
    flow: purchaseFlow,
    questions: ['다음 화면에 어떤 값을 넘겨야 할까?', '달러로 얼마를 충전해야 할까?'],
    sections: [
      {
        id: 'context', title: '상품 가격과 충전 금액의 통화가 다릅니다',
        paragraphs: [
          '사용자는 상품 링크를 붙여 넣고 옵션별 수량을 고릅니다. 해외 상품의 위안화 가격을 확인한 뒤, 결제에 필요한 달러 충전 금액까지 알아야 했습니다.',
          'React와 초기 기본 구조, 화면 디자인의 큰 틀은 정해져 있었습니다. 이를 바탕으로 상세 기획과 추가 라이브러리 선정, 새로운 구조 설계를 맡고 프론트엔드 전체를 혼자 구현했습니다.',
        ],
      },
      {
        id: 'implementation', title: '구매 상태와 환율 계산을 나눴습니다',
        paragraphs: [
          '상품 상세에서 고른 옵션과 수량은 장바구니와 결제 화면에서도 필요했습니다. 이 값을 관리하는 데 Zustand를 썼습니다. 옵션을 고르다 멈춘 사용자는 임시저장한 값을 다시 불러올 수 있습니다.',
          '충전 계산기는 환율을 적용하면서 소수점 아래 금액을 여러 번 계산합니다. 자바스크립트 부동소수점 연산에서 생기는 오차를 줄이려고 big.js를 썼고 최종 달러 충전 금액도 검증했습니다.',
        ],
      },
      {
        id: 'result', title: '2025년 2월 출시 후 고친 부분',
        paragraphs: ['2025년 2월, 상품을 조회하고 장바구니를 거쳐 결제한 뒤 주문 상태를 확인하는 흐름을 공개했습니다. 출시 후에는 외부 인증이 만료되거나 상품 조회가 실패할 때 로딩을 끝내고 돌아갈 수 있도록 보완했습니다.'],
      },
    ],
  },
  {
    slug: 'delivery-logistics',
    number: '02',
    name: '배송·물류 신청 서비스',
    kind: 'case',
    title: '같은 트래킹번호의 상품을\n함께 옮기기',
    description: '배송상품을 등록하고 신청 유형을 분류해 출고를 요청하는 서비스입니다.',
    lead: '목록에서는 여러 줄이어도 같은 트래킹번호로 들어온 상품은 한 묶음입니다. 한 줄만 골라도 묶음 전체를 옮기고, 입고오류 상품이 하나라도 있으면 합배송으로 옮기지 않도록 했습니다.',
    role: '등록·분류·출고 화면 구현 · 상품 이동 규칙 설계',
    milestone: '버튼과 드래그의 묶음 이동·차단 검증',
    flow: deliveryFlow,
    questions: ['상품 하나를 끌었을 때 무엇을 함께 옮길까?', '묶음 안에 이동할 수 없는 상품이 있으면 어떻게 할까?'],
    sections: [
      {
        id: 'context', title: '한 줄을 끌면 어디까지 옮길까?',
        paragraphs: [
          '상품을 끌어 다른 신청 유형으로 옮기는 조작은 기존 디자인에 있었습니다. 한 행만 옮기면 화면의 분류와 실제 입고 단위가 어긋나기 때문에, 등록·분류 화면을 구현할 때 트래킹번호를 이동 기준으로 삼았습니다.',
        ],
      },
      {
        id: 'implementation', title: '버튼과 드래그에서 함께 쓰는 함수',
        paragraphs: [
          '두 조작 모두 같은 상태 변경 함수를 호출하도록 했습니다. 이 함수에서 같은 트래킹번호의 상품을 모읍니다. 전부 옮길 수 있을 때만 목록을 한 번 갱신합니다.',
          '입고오류 상품이 포함된 묶음을 합배송으로 옮기려 하면 정상 행까지 원래 위치에 둡니다. 일부 행만 먼저 옮겼다가 되돌리는 중간 상태를 만들 필요가 없습니다.',
        ],
      },
      {
        id: 'result', title: '합배송 이동 테스트',
        paragraphs: ['회귀 테스트에서 버튼으로 한 번, 드래그로 한 번 같은 상품을 옮겨봤습니다. 정상 상품만 있는 묶음은 함께 이동했고 입고오류 상품이 낀 묶음은 전부 원래 목록에 남았습니다.'],
      },
    ],
  },
  {
    slug: 'frontend-reliability',
    number: '03',
    name: 'FE 품질·관측',
    kind: 'case',
    title: '확장 프로그램이 응답하지 않을 때\n로그인 대기 끝내기',
    description: '브라우저 확장 프로그램에서 웹으로 넘어올 때 발생하는 로그인 오류를 다뤘습니다.',
    lead: '확장 프로그램이 5초 안에 응답하지 않으면 요청을 종료하고 홈으로 돌아가게 했습니다. 뒤늦은 응답은 무시하고, Sentry에는 시간 초과를 별도로 기록합니다.',
    role: '로그인 예외 처리 · Sentry 오류 분류 · 회귀 검증',
    milestone: '응답 지연과 뒤늦은 응답에 대한 테스트 통과',
    flow: loginFlow,
    questions: ['웹에서 확장 프로그램을 얼마나 기다릴까?', '대기가 끝난 뒤 도착한 응답은 어떻게 다룰까?'],
    sections: [
      {
        id: 'context', title: '로그인 화면에서 로딩이 끝나지 않을 때',
        paragraphs: ['확장 프로그램에서 웹 서비스를 열면 웹은 로그인 정보를 요청하고 응답을 받아 세션을 연결합니다. 확장 프로그램이 응답하지 않으면 로딩이 끝나지 않았습니다. 사용자 입장에서는 더 기다려야 할지 알기 어려웠습니다.'],
      },
      {
        id: 'implementation', title: '5초가 지난 뒤에 응답이 오면',
        paragraphs: [
          '응답을 기다리는 시간을 5초로 정했습니다. 그 안에 응답이 없으면 요청을 종료하고 설치·로그인 상태를 확인하도록 안내한 뒤 홈으로 돌려보냅니다.',
          '이미 끝난 요청에 뒤늦게 응답이 오면 그 응답은 무시합니다. Sentry에는 시간 초과를 별도 원인으로 기록해 일반 로그인 실패와 구별할 수 있게 했습니다.',
        ],
      },
      {
        id: 'result', title: '응답 순서를 바꿔 복귀 동작을 확인했습니다',
        paragraphs: ['단위 테스트에서는 가상 타이머를 5초 진행시킨 뒤 응답을 전달했습니다. 페이지 테스트에서는 안내가 뜨는지, 홈으로 돌아가는지, Sentry에 시간 초과로 기록되는지 확인했습니다.'],
      },
    ],
  },
  {
    slug: 'style-label',
    number: '04',
    name: '의류 사입 커머스',
    kind: 'note',
    title: '의류 사입의 탐색과 주문',
    description: '사입할 상품을 찾고 주문한 뒤 물류비와 주문내역을 확인하는 의류 커머스입니다.',
    role: '상품·스토어 탐색과 주문·결제 UI 개발',
    questions: [],
    note: '2025년 초기 구축과 2026년 재구축에 참여해 상품·스토어 검색부터 주문·결제 화면까지 만들었습니다. 상품 목록으로 돌아올 때 보던 위치를 복원하고, 주문 후에는 마이페이지에서 주문내역과 물류비를 확인할 수 있게 했습니다. 2026년 3월 운영 사이트에 연결됐습니다.',
  },
];
