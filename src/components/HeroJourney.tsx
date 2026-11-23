import { useId, useState } from 'react';

const scenes = [
  {
    label: '구축',
    title: '서로 다른 단계를, 하나의 흐름으로.',
    nodes: ['상품 탐색', '옵션 선택', '장바구니', '충전·결제'],
    end: '주문현황',
    foot: 'COMMERCE / CONNECT THE STEPS',
  },
  {
    label: '확장',
    title: '달라지는 운영 조건까지 담습니다.',
    nodes: ['상품 등록', '유형 분류', '일반 출고', '쿠팡 출고'],
    end: '배송현황',
    foot: 'LOGISTICS / HANDLE THE BRANCHES',
  },
  {
    label: '개선',
    title: '발견한 문제를, 확인할 수 있는 변화로.',
    nodes: ['오류 관측', '조건 재현', '범위 확인', '수정·검증'],
    end: '운영 확인',
    foot: 'RELIABILITY / CLOSE THE LOOP',
  },
];

export function HeroJourney() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const id = useId();
  const scene = scenes[sceneIndex]!;
  const wirePath =
    sceneIndex === 1
      ? 'M82 34H278V65H82V112M278 65V112M82 112V152H278V112M180 152V175'
      : 'M82 34H278V112H82V152H180V175';
  return (
    <div className="journey">
      <div className="journey-controls" role="group" aria-label="경험의 범위 선택">
        {scenes.map((item, index) => (
          <button
            type="button"
            key={item.label}
            aria-pressed={sceneIndex === index}
            aria-controls={id}
            onClick={() => setSceneIndex(index)}
          >
            <span className="mono">0{index + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="journey-canvas" id={id} aria-live="polite" aria-atomic="true">
        <span className="journey-cross journey-cross--tl" aria-hidden="true">
          +
        </span>
        <span className="journey-cross journey-cross--br" aria-hidden="true">
          +
        </span>
        <div key={sceneIndex} className="journey-scene">
          <p className="journey-title">{scene.title}</p>
          <div className={`journey-network journey-network--${sceneIndex}`}>
            <svg className="network-wires" viewBox="0 0 360 190" fill="none" aria-hidden="true">
              <path className="wire-base" d={wirePath} />
              <path className="wire-active" pathLength="1" d={wirePath} />
            </svg>
            {scene.nodes.map((node, index) => (
              <span key={index} className={`journey-node journey-node--${index}`}>
                <span className="node-dot" />
                {node}
              </span>
            ))}
            <span className="journey-terminal">
              <span aria-hidden="true">↳</span> {scene.end}
              <span className="terminal-dot" />
            </span>
          </div>
          <div className="journey-caption">
            <span className="mono">{scene.foot}</span>
            <span className="mono">0{sceneIndex + 1} / 03</span>
          </div>
        </div>
      </div>
      <p className="journey-annotation">제가 다뤄온 흐름을 간단히 재구성했습니다.</p>
    </div>
  );
}
