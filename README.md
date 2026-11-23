# 임재혁 — Product Engineer & Creative Developer

[공개 포트폴리오 보기](https://harmon96.github.io/harmon96-portfolio/)

수면에 물방울을 세 번 떨어뜨리거나 인트로를 건너뛰면 전시장에 들어갑니다. 화면 전체를 사용하는 3D 공간에서 실무 프로젝트와 직접 조작하는 실험을 소개합니다. React·TypeScript·Vite에 Three.js를 지연 로딩하며, 조형물과 입체 글자는 코드로 제작합니다. Lenis로 스크롤을 부드럽게 연결하고, 소개와 경력은 화면에 들어올 때 단계적으로 드러납니다. 모션 감소 설정에서는 부드러운 스크롤과 등장 효과를 끕니다.

## 실행

Node.js 22.12 이상이 필요합니다. `.nvmrc`는 Node 22를 사용합니다.

```sh
npm ci
npm run dev
```

개발: http://127.0.0.1:5173

```sh
npm run build
npm run preview
npm test
```

검증된 정적 결과 미리보기: http://127.0.0.1:4173

빌드에는 타입 검사가 포함됩니다. 홈, 사례 4개와 404 페이지를 HTML로 생성한 뒤 브라우저에서 hydrate합니다. 콘텐츠는 JavaScript 실행 전에도 존재합니다. 빌드와 개발 시 동일한 `App`과 콘텐츠 데이터를 사용합니다.

## 구조

```text
src/
  content/        경력·사례와 설명용 흐름 데이터
  components/     입체 작업 공간, 상세 조형물, 레이아웃·흐름도
  scene/          Three.js 조형물, 카메라·조명·입력·리소스 수명 주기
  pages/          홈과 프로젝트 상세
  hooks/          모션 설정과 스크롤 위치 감지
  lib/            배포 기본 경로와 URL 처리
  styles.css      기존 상세 페이지와 기본 스타일
  exhibition.css  소개·경력 공통 레이아웃
  spatial.css     화면 전체의 작업 공간과 반응형
scripts/
  build.tsx       Vite 빌드와 페이지 HTML 생성
  preview.ts      실제 파일·404를 제공하는 로컬 미리보기
tests/            브라우저 기반 탐색·회귀 검증
docs/             참고 사이트와 설계 근거
```

## GitHub Pages 배포

`main`에 푸시하면 GitHub Actions가 타입 검사와 정적 빌드를 실행한 뒤 `dist/`를 GitHub Pages에 배포합니다. 로컬에서 같은 경로로 빌드와 브라우저 검사를 실행할 수 있습니다.

```sh
export PORTFOLIO_BASE_PATH=/harmon96-portfolio/
npm run build
npm test
npm run preview
```

홈과 각 프로젝트 상세는 독립된 HTML 파일로 생성됩니다. 배포 설정은 [.github/workflows/pages.yml](.github/workflows/pages.yml)에 있습니다.

## 조작

- 빈 공간을 드래그하거나 캔버스에 포커스한 뒤 방향키로 시점을 바꿉니다. Home 키로 기본 방향에 돌아갑니다.
- 작품을 선택하면 화면 안에서 설명을 읽고, 사례 상세로 이동할 수 있습니다. Escape 또는 전체 작업으로 복귀합니다.
- 실험에서는 띠를 비틀고 PLAY 글자를 각각 옮길 수 있습니다. 슬라이더·방향 버튼과 초기화도 제공합니다.
- JavaScript나 WebGL을 사용할 수 없어도 실무 사례를 읽을 수 있습니다.

## 콘텐츠 관리

`src/content/portfolio.ts`에서 공개 프로필과 사례를 수정합니다. 사실 확인용 비공개 메모는 버전 관리·빌드 대상 밖인 `.private/`에 보관합니다. 회사 내부 URL과 고객 자료를 소스에 넣지 않습니다. 설정하지 않은 연락처 버튼은 렌더링하지 않습니다.

대표 사례는 해외 상품 직접구매, 배송·물류, FE 품질·관측입니다. 의류 사입 커머스는 짧은 작업 소개로 수록했습니다.

[디자인과 인터랙션 설계](docs/design-direction.md)

## 검증

`npm test`는 먼저 만들어진 `dist/`를 대상으로 Chrome을 실행합니다. Chrome이 없는 환경은 Playwright Chromium을 설치하고 `PLAYWRIGHT_CHANNEL=chromium npm test`로 실행합니다. 이 값은 테스트 전용입니다. 기본 경로가 있는 빌드를 검증하려면 같은 경로를 `PORTFOLIO_BASE_PATH`로 전달합니다.

공식 참고: [Vite 정적 배포](https://vite.dev/guide/static-deploy.html), [React renderToString](https://react.dev/reference/react-dom/server/renderToString).

로컬 시각 검토 자료는 git에서 제외된 `artifacts/spatial-review/`에 있습니다. 실제 조작 영상은 `interaction.webm`, 측정 환경과 결과는 `metrics.json`을 확인하세요.
