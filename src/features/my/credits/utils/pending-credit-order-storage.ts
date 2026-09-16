'use client';

/** 결제창으로 나가기 직전 남겨 두는 주문. 복귀 URL에 주문 ID가 실려 오지 않아 기기에 보관한다. */
export type PendingCreditOrder = {
  orderId: string;
  /** 저장 시각(epoch ms). 오래된 기록은 복귀로 보지 않는다. */
  savedAt: number;
};

export const PENDING_CREDIT_ORDER_STORAGE_KEY = 'manyak:pending-credit-order';

const PENDING_CREDIT_ORDER_CHANGE_EVENT = 'manyak:pending-credit-order-change';

/** 결제창에 이 시간 넘게 머문 기록은 버린다. 그로블 결제창은 몇 분이면 끝난다. */
export const PENDING_CREDIT_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 저장 원문을 대기 주문으로 파싱한다. 손상·형태 불일치·만료는 null이다.
 *
 * @param raw localStorage 원문
 * @param now 만료 판정 기준 시각(epoch ms)
 * @returns 유효한 대기 주문 또는 null
 */
export function parsePendingCreditOrder(
  raw: string | null,
  now: number,
): PendingCreditOrder | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { orderId, savedAt } = parsed as Record<string, unknown>;

    if (typeof orderId !== 'string' || orderId === '') {
      return null;
    }

    if (
      typeof savedAt !== 'number' ||
      now - savedAt > PENDING_CREDIT_ORDER_TTL_MS
    ) {
      return null;
    }

    return { orderId, savedAt };
  } catch {
    return null;
  }
}

/**
 * 대기 주문을 저장한다(결제창 이동 직전).
 *
 * @param orderId 방금 만든 주문의 공개 ID
 */
export function savePendingCreditOrder(orderId: string): void {
  try {
    const record: PendingCreditOrder = { orderId, savedAt: Date.now() };

    window.localStorage.setItem(
      PENDING_CREDIT_ORDER_STORAGE_KEY,
      JSON.stringify(record),
    );
    window.dispatchEvent(new Event(PENDING_CREDIT_ORDER_CHANGE_EVENT));
  } catch {
    // 저장소가 막힌 환경에서는 복귀 확인 없이 결제창으로만 보낸다.
  }
}

/** 대기 주문을 지운다(확인 완료·닫기). */
export function clearPendingCreditOrder(): void {
  try {
    window.localStorage.removeItem(PENDING_CREDIT_ORDER_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_CREDIT_ORDER_CHANGE_EVENT));
  } catch {
    // 지울 수 없으면 다음 진입에서 TTL로 걸러진다.
  }
}

/**
 * 대기 주문 변경(같은 탭 커스텀 이벤트·다른 탭 storage 이벤트)을 구독한다.
 *
 * @param onStoreChange 변경 알림 콜백
 * @returns 구독 해제 함수
 */
export function subscribePendingCreditOrder(
  onStoreChange: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === null || event.key === PENDING_CREDIT_ORDER_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(PENDING_CREDIT_ORDER_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(
      PENDING_CREDIT_ORDER_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

/** 유효한 대기 주문 ID 스냅샷. 문자열이라 참조가 안정돼 useSyncExternalStore에 그대로 쓴다. */
export function getPendingCreditOrderSnapshot(): string | null {
  try {
    return (
      parsePendingCreditOrder(
        window.localStorage.getItem(PENDING_CREDIT_ORDER_STORAGE_KEY),
        Date.now(),
      )?.orderId ?? null
    );
  } catch {
    return null;
  }
}

/** 서버 렌더에는 저장소가 없으므로 대기 주문이 없는 것으로 그린다. */
export function getServerPendingCreditOrderSnapshot(): null {
  return null;
}
