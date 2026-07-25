/**
 * 16바이트 난수를 채운다. crypto.getRandomValues는 insecure context에서도 동작하므로
 * 우선 사용하고, 그마저 없는 환경에서만 Math.random으로 대체한다.
 *
 * @returns 난수로 채워진 16바이트 배열
 */
function fillRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(bytes);
  }

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

/**
 * 클라이언트에서 사용할 고유 ID를 UUID v4 형식으로 생성한다.
 * crypto.randomUUID를 우선 사용하고, 지원하지 않는 환경(http://<LAN IP> 실기기 접속
 * 같은 insecure origin)에서는 난수 바이트로 직접 조립한다. 백엔드가 requestId를
 * UUID로 검증하므로(스펙 §4-3-8) 어떤 폴백에서도 UUID 형식을 유지해야 한다.
 *
 * @returns 생성된 UUID v4 문자열
 */
export function createClientId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = fillRandomBytes();

  // RFC 4122 v4: version(4)·variant(10xx) 비트를 고정한다.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
