import { IS_META_PIXEL_ENABLED } from './config';
import { isStandardMetaPixelEvent, type MetaPixelEventName } from './events';

/** Meta 픽셀 전역 함수(fbq)의 형태. 공식 스니펫이 만드는 구조와 동일하다. */
type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

/**
 * 스크립트 로드 전 호출을 큐에 쌓아 두는 fbq 스텁을 만든다.
 * 공식 스니펫의 IIFE와 동일한 동작을 타입이 있는 코드로 옮긴 것이다.
 *
 * @returns fbq 스텁 함수
 */
function createFbqStub(): Fbq {
  const stub = ((...args: unknown[]) => {
    if (stub.callMethod) {
      stub.callMethod(...args);
    } else {
      stub.queue.push(args);
    }
  }) as Fbq;

  stub.queue = [];
  stub.loaded = true;
  stub.version = '2.0';
  stub.push = stub;

  return stub;
}

/**
 * Meta 픽셀 스크립트를 로드하고 픽셀을 초기화한다.
 * 이미 로드된 경우 아무것도 하지 않으며, 브라우저에서만 호출해야 한다.
 *
 * @param pixelId 초기화할 Meta 픽셀 ID
 */
export function loadMetaPixel(pixelId: string): void {
  if (window.fbq) return;

  const fbq = createFbqStub();

  window.fbq = fbq;
  window._fbq ??= fbq;

  const script = document.createElement('script');

  script.async = true;
  script.src = FBEVENTS_SRC;
  document.head.appendChild(script);

  fbq('init', pixelId);
}

/**
 * Meta 픽셀 이벤트를 전송한다. 표준/맞춤 이벤트에 맞는 메서드를 고르고,
 * 이후 Conversions API(서버 전송) 도입 시 중복 제거 키로 쓰도록 eventID를 부여한다.
 * 픽셀이 비활성화된 환경에서는 전송 대신 콘솔 디버그 로그로 대체한다.
 *
 * @param name Meta 픽셀 이벤트 이름
 */
export function trackMetaPixel(name: MetaPixelEventName): void {
  if (!IS_META_PIXEL_ENABLED) {
    console.debug('[meta-pixel]', name);

    return;
  }

  const method = isStandardMetaPixelEvent(name) ? 'track' : 'trackCustom';

  window.fbq?.(method, name, {}, { eventID: crypto.randomUUID() });
}

/** 브라우저당 1회 발화 플래그를 저장하는 localStorage 키 접두사. */
const ONCE_STORAGE_PREFIX = 'manyak-meta-pixel-fired:';

/** localStorage가 막힌 환경에서 페이지 세션 내 중복 발화를 막는 폴백 플래그. */
const firedInMemory = new Set<MetaPixelEventName>();

/**
 * 브라우저당 1회만 발화해야 하는 이벤트를 전송한다(캠페인 문서의 "최초 성공 1회" 정책).
 * localStorage 플래그로 재발화를 막고, 저장이 막힌 환경(시크릿 모드 등)에서는
 * 메모리 플래그로 페이지 세션 내 중복만 막는다.
 *
 * @param name Meta 픽셀 이벤트 이름
 */
export function trackMetaPixelOnce(name: MetaPixelEventName): void {
  if (firedInMemory.has(name)) return;

  firedInMemory.add(name);

  try {
    const key = ONCE_STORAGE_PREFIX + name;

    if (window.localStorage.getItem(key)) return;

    window.localStorage.setItem(key, '1');
  } catch {
    // 저장 실패 시 메모리 플래그만으로 중복을 막고 전송은 계속한다.
  }

  trackMetaPixel(name);
}
