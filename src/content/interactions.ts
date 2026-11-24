export type DecisionFlow = {
  caption: string;
  steps: { label: string; note: string; detail: string }[];
};

export const purchaseFlow: DecisionFlow = {
  caption: '옵션 선택에서 달러 충전액 검증까지',
  steps: [
    {
      label: '옵션 선택', note: '상품과 수량',
      detail: '상품 링크에서 옵션을 불러와 수량을 고릅니다. 임시저장한 옵션과 수량은 다음에 다시 불러올 수 있습니다.',
    },
    {
      label: '장바구니', note: '선택값 유지',
      detail: '상품 상세에서 고른 옵션과 수량을 장바구니와 결제 화면에서도 참조하도록 Zustand로 관리했습니다.',
    },
    {
      label: '환율 적용', note: '위안화에서 달러로',
      detail: '위안화 상품 가격을 바탕으로 달러 충전액을 계산합니다. 환율을 적용하는 소수점 연산에 big.js를 사용했습니다.',
    },
    {
      label: '충전액 확인', note: '최종 달러 금액',
      detail: '결제에 필요한 달러 충전 금액을 검증하고 화면에 표시합니다.',
    },
  ],
};

export const deliveryFlow: DecisionFlow = {
  caption: '합배송 신청으로 상품을 옮길 때의 판단 순서',
  steps: [
    {
      label: '상품 선택', note: '버튼 또는 드래그',
      detail: '신청 유형을 바꿀 상품을 고릅니다. 이동 버튼을 누르거나 상품을 드래그할 수 있습니다.',
    },
    {
      label: '묶음 찾기', note: '같은 트래킹번호',
      detail: '선택한 행과 트래킹번호가 같은 상품을 한 묶음으로 모읍니다.',
    },
    {
      label: '상태 검사', note: '입고오류 포함 여부',
      detail: '합배송 신청으로 옮길 때 묶음 안에 입고오류 상품이 있는지 검사합니다.',
    },
    {
      label: '이동 결정', note: '함께 이동 또는 차단',
      detail: '입고오류 상품이 없으면 묶음을 함께 옮깁니다. 하나라도 있으면 모두 원래 목록에 남습니다.',
    },
  ],
};

export const loginFlow: DecisionFlow = {
  caption: '확장 프로그램의 로그인 응답이 늦게 오는 경우',
  steps: [
    {
      label: '웹 진입', note: '로그인 정보 요청',
      detail: '웹 로그인 화면이 브라우저 확장 프로그램에 로그인 정보를 요청합니다.',
    },
    {
      label: '대기', note: '최대 5초',
      detail: '응답을 기다리는 동안 타이머를 시작합니다. 정상 응답이 오면 다음 로그인 단계로 진행합니다.',
    },
    {
      label: '시간 초과', note: '안내 후 홈 복귀',
      detail: '5초가 지나면 대기를 끝내고 안내 후 홈으로 돌아갑니다. 이때 시간 초과를 별도 원인으로 기록합니다.',
    },
    {
      label: '늦은 응답', note: '종료한 요청',
      detail: '시간이 지난 뒤 응답이 도착해도 로그인 처리를 다시 시작하지 않습니다.',
    },
  ],
};
