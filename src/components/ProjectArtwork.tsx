import type { ArtworkKind } from '../content/exhibition';

/** Original, schematic artwork. It contains no company screenshots or customer data. */
export function ProjectArtwork({ kind }: { kind: ArtworkKind }) {
  return (
    <div className={`project-art project-art--${kind}`} aria-hidden="true">
      {kind === 'commerce' && (
        <>
          <span className="art-edition">01 / A CONNECTED PURCHASE</span>
          <div className="commerce-window">
            <div className="art-window-bar"><i /><i /><i /><span>상품 탐색</span></div>
            <div className="commerce-products">
              <div className="commerce-product"><span className="art-vase" /><i /><i /></div>
              <div className="commerce-product"><span className="art-lamp" /><i /><i /></div>
              <div className="commerce-product"><span className="art-chair" /><i /><i /></div>
            </div>
            <div className="commerce-line"><span>선택한 상품</span><strong>장바구니 ↗</strong></div>
          </div>
          <div className="commerce-ticket">
            <span>ORDER SUMMARY</span>
            <strong>선택에서<br />주문까지.</strong>
            <div className="art-ticket-rule" />
            <div className="commerce-ticket-bottom"><span>구매 흐름</span><b>↗</b></div>
          </div>
          <span className="art-bottom-label">EXPLORE → SELECT → ORDER</span>
        </>
      )}
      {kind === 'logistics' && (
        <>
          <span className="art-edition">02 / EVERY STEP CONNECTED</span>
          <div className="logistics-sheet">
            <div className="logistics-sheet-title"><span>배송상품</span><strong>→</strong></div>
            {['상품 등록', '유형 분류', '출고 신청'].map((label, index) => (
              <div className="logistics-row" key={label}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}</span><b>↗</b></div>
            ))}
            <div className="art-barcode" />
          </div>
          <div className="logistics-parcel"><span className="parcel-tape" /><span className="parcel-sticker">SL<br /><small>DELIVERY</small></span><span className="parcel-arrow">↑↑</span></div>
          <span className="art-bottom-label">등록 · 분류 · 출고 · 확인</span>
        </>
      )}
      {kind === 'style' && (
        <>
          <span className="art-edition">03 / DISCOVER SOMETHING GOOD</span>
          <div className="style-editorial">
            <span className="style-brand">Style<br /><em>Label.</em></span>
            <div className="style-shirt"><i /><b /><span /></div>
            <div className="style-editorial-footer"><span>THE EVERYDAY EDIT</span><span>↗</span></div>
          </div>
          <div className="style-options"><span>SELECT YOUR OPTION</span><div><i /><i /><i /></div><strong>발견에서, 구매로.</strong></div>
          <span className="art-bottom-label">A THOUGHTFUL SHOPPING EXPERIENCE</span>
        </>
      )}
      {kind === 'reliability' && (
        <>
          <span className="art-edition">04 / MAKE THE INVISIBLE VISIBLE</span>
          <div className="reliability-window">
            <div className="art-window-bar"><i /><i /><i /><span>trace / inspect</span></div>
            <div className="reliability-lines"><span /><span /><span /><span /><span /></div>
            <div className="reliability-trace"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="reliability-status"><i /><span>조건을 찾고, 다시 확인하기</span></div>
          </div>
          <div className="reliability-note"><span>REPRODUCE</span><strong>→</strong><span>VERIFY</span><div className="reliability-check">✓</div></div>
          <span className="art-bottom-label">OBSERVE → REPRODUCE → VERIFY</span>
        </>
      )}
    </div>
  );
}
