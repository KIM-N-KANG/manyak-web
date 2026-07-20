/** Meta 표준 이벤트 이름. `fbq('track', ...)`으로 전송한다. */
const STANDARD_EVENTS = ['PageView', 'StartTrial'] as const;

export type MetaPixelStandardEvent = (typeof STANDARD_EVENTS)[number];

/** 마냑 맞춤 이벤트 이름. `fbq('trackCustom', ...)`으로 전송한다. */
export type MetaPixelCustomEvent = 'StorylinesGenerated' | 'StoryCompiled';

/** 전송 가능한 Meta 픽셀 이벤트 이름. 캠페인 문서(마케팅 전략 26/07)의 4종과 일치한다. */
export type MetaPixelEventName = MetaPixelStandardEvent | MetaPixelCustomEvent;

/**
 * Meta 표준 이벤트인지 판별한다. 표준·맞춤 이벤트는 fbq 호출 메서드가 다르다.
 *
 * @param name Meta 픽셀 이벤트 이름
 * @returns 표준 이벤트 여부
 */
export function isStandardMetaPixelEvent(
  name: MetaPixelEventName,
): name is MetaPixelStandardEvent {
  return (STANDARD_EVENTS as readonly string[]).includes(name);
}
