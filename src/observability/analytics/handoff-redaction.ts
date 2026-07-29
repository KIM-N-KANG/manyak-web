import type * as amplitude from '@amplitude/unified';

import { redactHandoffCode } from '@/lib/auth/handoff-query';
import { redactShareId } from '@/lib/shares/share-url-redaction';

/** amplitude.add가 받는 플러그인 타입. SDK 내부 타입에 직접 의존하지 않도록 시그니처에서 뽑는다. */
type AnalyticsPlugin = Parameters<typeof amplitude.add>[0];

/** 중첩 프로퍼티(예: identify의 $set) 탐색 깊이 상한. */
const MAX_REDACTION_DEPTH = 3;

/**
 * 값에 담긴 비밀 문자열을 재귀적으로 가린다. 문자열·배열·평범한 객체만 훑는다.
 *
 * 핸드오프 코드와 공유 열람 토큰을 함께 처리한다. 둘 다 값 자체가 접근 수단이라
 * 관측 저장소에 남으면 안 된다는 점에서 같은 규칙을 따른다.
 *
 * @param value 검사할 프로퍼티 값
 * @param depth 현재 탐색 깊이
 * @returns 비밀을 가린 값. 대상이 아니면 원래 값 그대로다
 */
function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return redactShareId(redactHandoffCode(value));
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactValue(item, depth + 1),
      ]),
    );
  }

  return value;
}

/**
 * 이벤트 프로퍼티에 섞인 핸드오프 코드를 전송 전에 가리는 Amplitude 플러그인.
 *
 * autocapture 페이지뷰는 `[Amplitude] Page Location`에 `location.href` 전문을 싣는데,
 * 인앱 전환 안내(`/login/continue?handoff=...`)는 외부 브라우저로 주소를 넘겨야 해서
 * 코드를 URL에 유지한다. 그대로 두면 아직 유효한 일회용 코드가 분석 데이터로 나간다.
 *
 * 초기 페이지뷰까지 덮으려면 `initAll` **전에** 등록해야 한다(초기화 도중 발화하므로
 * 이후에 붙이면 놓친다). 다만 그 탓에 초기화 중 추가되는 enrichment 플러그인보다 먼저
 * 실행되므로, URL을 뒤늦게 붙이는 `pageUrlEnrichment`를 켜게 되면 이 순서를 재검토해야 한다.
 */
export const handoffRedactionPlugin: AnalyticsPlugin = {
  name: 'manyak-handoff-redaction',
  type: 'enrichment',
  execute: (event) => {
    if (event.event_properties) {
      event.event_properties = redactValue(event.event_properties) as Record<
        string,
        unknown
      >;
    }

    if (event.user_properties) {
      event.user_properties = redactValue(
        event.user_properties,
      ) as typeof event.user_properties;
    }

    return Promise.resolve(event);
  },
};
