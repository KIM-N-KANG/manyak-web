/**
 * 클라이언트에서 사용할 고유 ID를 생성한다.
 * crypto.randomUUID를 우선 사용하고, 지원하지 않는 환경에서는 타임스탬프 조합으로 대체한다.
 */
export function createClientId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
