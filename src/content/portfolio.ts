export type PublicLink = { label: string; href: string };
export type CaseSection = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  points?: { title: string; text: string }[];
};
export type Project = {
  slug: string;
  number: string;
  name: string;
  category: string;
  title: string;
  description: string;
  tags: string[];
  role: string;
  milestone: string;
  outcome: string;
  flow: { label: string; note: string }[];
  flowNote: string;
  scope: string[];
  questions: string[];
  sections: CaseSection[];
};

export const profile = {
  name: '임재혁',
  handle: 'Harmon',
  role: 'Product Engineer & Creative Developer',
  introduction:
    '상품 탐색부터 결제와 출고까지, 여러 정책과 상태가 얽힌 사용자 흐름을 만들어왔습니다. 새로운 기능을 출시하고, 실제 사용 중 드러나는 예외를 해결하며 제품을 개선합니다.',
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
        '해외 상품 직접구매 플랫폼의 프론트엔드를 맡았습니다. 배송·물류 신청 서비스를 구축하고, 의류 사입 커머스의 상품 탐색과 주문·결제 화면을 개발했습니다.',
    },
    {
      company: 'EIPGRID',
      period: '2021.12 — 2024.10',
      role: 'Frontend Engineer',
      description:
        '에너지 서비스의 대시보드와 전력 설비 단선결선도 화면을 개발했습니다. 설비가 어떻게 연결되는지 보여주기 위해 JointJS를 선정했습니다. 제공받은 설비 기호와 연결 데이터를 받아 화면에 그리는 프론트엔드는 혼자 구현했습니다.',
    },
  ],
};

export const workingPrinciples = [
  {
    title: '흐름부터 이해합니다.',
    text: '화면 하나를 고치기 전에 사용자의 이전 행동과 다음 단계를 살펴봅니다. 코드와 오류 기록을 함께 읽으며 문제가 생기는 조건을 좁힙니다.',
  },
  {
    title: '변경과 검증을 함께 설계합니다.',
    text: '기존 구현과 영향 범위를 확인하고, 수정할 부분과 검증할 시나리오를 정합니다. 구현 완료, 테스트 통과, 배포, 운영 확인을 구분합니다.',
  },
  {
    title: '판단의 맥락을 남깁니다.',
    text: '선택한 방향과 이유, 확인하지 못한 조건을 기록합니다. 다음 문제를 만났을 때 코드뿐 아니라 당시의 판단도 다시 살펴볼 수 있도록 합니다.',
  },
];

export const projects: Project[] = [
  {
    slug: '1688-direct-purchase',
    number: '01',
    name: '해외 상품 직접구매 플랫폼',
    category: 'COMMERCE',
    title: '상품 링크 하나에서\n해외 결제까지',
    description: '해외 상품의 옵션을 고르고 주문할 때까지, 사용자가 고른 수량과 통화별 금액이 여러 화면을 거칩니다. 이 구매 흐름을 상세 기획하고 프론트엔드 전체를 구현했습니다.',
    tags: ['React', 'Zustand', 'big.js'],
    role: '상세 기획 · FE 설계와 구현 · 출시 후 운영',
    milestone: '2025년 2월 운영 오픈',
    flow: [
      { label: '상품 조회', note: 'URL과 옵션' },
      { label: '장바구니', note: '옵션과 수량' },
      { label: '충전·결제', note: '환율과 결제 통화' },
      { label: '주문현황', note: '결제 이후 상태' },
    ],
    flowNote: '상품을 선택한 시점부터 결제 결과를 확인하기까지의 흐름입니다.',
    scope: ['상품 조회·옵션 선택·장바구니', '외부 인증과 충전·상품 결제', '주문현황과 출시 후 예외 처리'],
    questions: ['구매 단계를 넘어갈 때 어떤 상태를 이어갈까?', '다른 통화로 충전할 금액을 어떻게 계산할까?'],
    sections: [
      {
        id: 'context', eyebrow: 'CONTEXT', title: '상품 가격과 충전 금액의 통화가 다릅니다',
        paragraphs: [
          '사용자는 상품 링크를 붙여 넣고 옵션별 수량을 고릅니다. 해외 상품의 위안화 가격을 확인한 뒤, 결제에 필요한 달러 충전 금액까지 알아야 했습니다.',
          '프로젝트의 React 기반과 큰 디자인 틀은 정해져 있었습니다. 옵션을 언제 검증하고 외부 인증이 끊기면 어디로 돌아올지 같은 세부 동작은 제가 정하고 구현했습니다.',
        ],
      },
      {
        id: 'implementation', eyebrow: 'DECISION', title: '구매 상태와 환율 계산을 나눴습니다',
        paragraphs: [
          '상품 상세, 장바구니, 충전 요청, 결제를 오갈 때 선택한 상품과 수량을 이어가기 위해 Zustand를 도입했습니다. 옵션을 고르는 도중 입력을 멈춘 사용자는 임시저장한 정보를 다시 불러올 수 있게 했습니다.',
          '충전 계산기에는 환율을 적용하면서 소수 금액을 여러 차례 연산하는 구간이 있습니다. 여기에 big.js를 적용해 자바스크립트 부동소수점 연산에서 생기는 오차를 줄이고 최종 달러 충전 금액을 검증했습니다.',
        ],
      },
      {
        id: 'result', eyebrow: 'RESULT', title: '상품 선택부터 주문 확인까지 운영에 반영했습니다',
        paragraphs: ['2025년 2월, 상품을 조회하고 장바구니를 거쳐 결제한 뒤 주문 상태를 확인하는 흐름을 공개했습니다. 출시 후에는 외부 인증이 만료되거나 상품 조회가 실패할 때 로딩을 끝내고 돌아갈 수 있도록 보완했습니다.'],
      },
    ],
    outcome: '동일한 주문을 상품 옵션, 장바구니 수량, 결제 통화라는 서로 다른 관점에서 다뤘습니다.',
  },
  {
    slug: 'delivery-logistics',
    number: '02',
    name: '배송·물류 신청 서비스',
    category: 'LOGISTICS',
    title: '한 상자에 담긴 상품은\n함께 움직입니다',
    description: '배송 신청 목록에서 상품 하나를 옮기더라도 같은 트래킹번호로 입고된 상품은 함께 처리해야 합니다. 묶음 전체가 이동할 조건과 멈출 조건을 정해 화면에 반영했습니다.',
    tags: ['물류 정책', '드래그 앤 드롭', '회귀 테스트'],
    role: '등록·분류·출고 화면 구현 · 상품 이동 규칙 설계',
    milestone: '버튼과 드래그의 묶음 이동·차단 검증',
    flow: [
      { label: '상품 선택', note: '버튼 또는 드래그' },
      { label: '묶음 찾기', note: '같은 트래킹번호' },
      { label: '상태 검사', note: '입고오류 포함 여부' },
      { label: '이동 결정', note: '함께 이동 또는 차단' },
    ],
    flowNote: '선택한 상품과 함께 움직여야 할 묶음을 먼저 검사합니다.',
    scope: ['배송상품 등록·수정과 유형 분류', '일반·풀필먼트 출고 신청', '묶음 이동의 상태 판정과 회귀 검증'],
    questions: ['상품 하나를 끌었을 때 무엇을 함께 옮길까?', '묶음 안에 이동할 수 없는 상품이 있으면 어떻게 할까?'],
    sections: [
      {
        id: 'context', eyebrow: 'CONTEXT', title: '화면에서는 여러 줄, 물류에서는 한 묶음',
        paragraphs: [
          '상품 목록에서는 각각 다른 행이지만 같은 트래킹번호로 배송되는 상품이 있습니다. 한 행만 다른 신청 유형으로 옮기면 화면 속 분류와 실제 입고 단위가 어긋납니다.',
          '상품을 끌어서 옮기는 조작은 기존 디자인에 있었습니다. 저는 등록·분류 화면을 구현하면서 한 건을 선택했을 때 어디까지 함께 이동하고 어떤 상태에서 막을지 구체화했습니다.',
        ],
      },
      {
        id: 'implementation', eyebrow: 'DECISION', title: '버튼과 드래그가 같은 규칙을 사용합니다',
        paragraphs: [
          '두 조작 모두 같은 상태 변경 함수를 호출하도록 했습니다. 이 함수에서 동일 트래킹번호의 상품을 모으고 묶음 전체의 이동 가능 여부를 판정한 다음, 한 번에 목록을 갱신합니다.',
          '입고오류 상품이 포함된 묶음을 합배송으로 옮기려 하면 정상 행까지 원래 위치에 둡니다. 일부 행만 먼저 옮겼다가 되돌리는 중간 상태를 만들 필요가 없습니다.',
        ],
      },
      {
        id: 'result', eyebrow: 'RESULT', title: '두 가지 조작에서 같은 결과를 확인했습니다',
        paragraphs: ['회귀 테스트로 정상 상품이 이동하는 경우와 입고오류 상품이 포함된 묶음의 합배송 이동이 차단되는 경우를 확인했습니다. 버튼을 누르든 드래그하든 목록에 남는 상품은 같습니다.'],
      },
    ],
    outcome: '이 화면의 이동 단위는 클릭한 행으로 정해지지 않습니다. 창고에 함께 들어오는 상품의 관계가 그 단위를 결정합니다.',
  },
  {
    slug: 'frontend-reliability',
    number: '03',
    name: 'FE 품질·관측',
    category: 'RELIABILITY',
    title: '응답이 없는 로그인에\n돌아올 길을 만들었습니다',
    description: '브라우저 확장 프로그램에서 웹으로 로그인할 때 응답이 오지 않으면 사용자가 대기 화면에 머물 수 있었습니다. 대기를 끝내는 조건과 실패 원인을 기록하는 방식을 함께 정했습니다.',
    tags: ['브라우저 확장', '비동기 상태', 'Sentry'],
    role: '로그인 예외 처리 · Sentry 오류 분류 · 회귀 검증',
    milestone: '응답 지연과 뒤늦은 응답에 대한 테스트 통과',
    flow: [
      { label: '웹 진입', note: '확장에 로그인 정보 요청' },
      { label: '대기', note: '최대 5초' },
      { label: '시간 초과', note: '안내 후 홈 복귀' },
      { label: '늦은 응답', note: '완료한 요청 무시' },
    ],
    flowNote: '확장 프로그램의 응답이 늦어지는 조건을 재구성했습니다.',
    scope: ['확장 프로그램과 웹 사이의 로그인 연동', '시간 초과 후 사용자 안내와 복귀', '실패 원인 분류와 단위·페이지 테스트'],
    questions: ['다른 실행 환경의 응답을 얼마나 기다릴까?', '대기가 끝난 뒤 도착한 응답은 어떻게 다룰까?'],
    sections: [
      {
        id: 'context', eyebrow: 'CONTEXT', title: '화면 안의 로딩은 바깥의 응답을 기다렸습니다',
        paragraphs: ['확장 프로그램에서 웹 서비스를 열면 웹은 로그인 정보를 요청하고 응답을 받아 세션을 연결합니다. 확장이 응답하지 않는 상황에는 다음 단계로 넘어갈 계기가 없었습니다. 사용자는 화면을 보고도 계속 기다려야 할지 판단하기 어려웠습니다.'],
      },
      {
        id: 'implementation', eyebrow: 'DECISION', title: '기다리는 시간과 요청의 끝을 코드에 명시했습니다',
        paragraphs: [
          '응답을 기다리는 시간을 5초로 정했습니다. 그 안에 응답이 없으면 요청을 종료하고 설치·로그인 상태를 확인하도록 안내한 뒤 홈으로 돌려보냅니다.',
          '시간 초과 후 뒤늦게 응답이 와도 종료한 요청을 다시 시작하지 않게 했습니다. Sentry에는 시간 초과를 별도 원인으로 기록해 일반 로그인 실패와 구별할 수 있게 했습니다.',
        ],
      },
      {
        id: 'result', eyebrow: 'VERIFICATION', title: '응답 순서를 바꿔 복귀 동작을 확인했습니다',
        paragraphs: ['가상 타이머를 진행시키고 대기가 끝난 다음 응답을 전달하는 단위 테스트를 작성했습니다. 페이지 테스트에서는 시간 초과 때 안내와 복귀가 실행되고 관측 기록에도 해당 원인이 남는 것을 확인했습니다.'],
      },
    ],
    outcome: '재현하기 어려운 브라우저 간 타이밍 문제를 응답 순서를 직접 통제하는 테스트로 다시 확인할 수 있게 했습니다.',
  },
  {
    slug: 'style-label',
    number: '04',
    name: '의류 사입 커머스',
    category: 'CAREER NOTE',
    title: '의류 사입의 탐색과 주문',
    description: '상품과 스토어를 둘러보고 주문한 뒤 물류비와 내역을 확인하는 의류 사입 커머스의 초기 구축과 재구축에 참여했습니다.',
    tags: ['상품 탐색', '주문·결제', '반응형 UI'],
    role: '상품·스토어 탐색과 주문·결제 UI 개발',
    milestone: '2026년 3월 운영 사이트 연결',
    flow: [
      { label: '탐색', note: '상품·스토어' },
      { label: '주문서', note: '주문 정보' },
      { label: '결제', note: '주문·물류비' },
      { label: '마이페이지', note: '주문내역' },
    ],
    flowNote: '사입 상품의 탐색부터 주문내역 확인까지의 흐름입니다.',
    scope: ['상품·스토어 검색과 반응형 탐색 화면', '주문서, 결제, 물류비와 주문내역'],
    questions: [],
    sections: [{
      id: 'result', eyebrow: 'CAREER NOTE', title: '상품 탐색부터 주문내역 확인까지',
      paragraphs: ['2025년 초기 구축과 2026년 재구축에 참여했습니다. 상품 목록으로 돌아올 때 탐색하던 위치를 복원하고, 주문 후에는 마이페이지에서 내역과 물류비를 확인할 수 있게 했습니다.'],
    }],
    outcome: '',
  },
];
