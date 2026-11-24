import { useId } from 'react';

import { CREDIT_PURCHASE_NOTICE } from '../constants';

/**
 * 구매 탭 상품 목록 아래의 환불과 이용 안내. 접어 두지 않고 펼쳐 두어 구매 전에 청약철회 제한과
 * 미성년자 취소를 확인할 수 있게 한다.
 * 유상 구매는 웹에만 있어 맞출 앱 화면이 없으므로, 긴 안내문이 낱말 중간에서 끊기지 않게 어절 단위로 줄을 바꾼다.
 */
export function CreditPurchaseNotice() {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 px-4 pt-8 break-keep">
      <h2 id={titleId} className="text-sm font-semibold">
        {CREDIT_PURCHASE_NOTICE.title}
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-5 text-foreground-secondary">
        {CREDIT_PURCHASE_NOTICE.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
