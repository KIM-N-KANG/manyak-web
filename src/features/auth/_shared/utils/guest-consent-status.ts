/**
 * 필수 필드가 빠진 서버 응답을 동의 완료로 간주하지 않는다.
 * @param value 서버 동의 응답
 * @returns 유효한 게스트 동의 상태 또는 null
 */
export function parseGuestConsent(value: unknown): {
  requiredVersion: string;
  needsConsent: boolean;
} | null {
  if (typeof value !== 'object' || value === null || !('guestPrivacy' in value))
    return null;

  const status = value.guestPrivacy;

  if (
    typeof status !== 'object' ||
    status === null ||
    !('requiredVersion' in status) ||
    typeof status.requiredVersion !== 'string' ||
    !status.requiredVersion.trim() ||
    !('needsConsent' in status) ||
    typeof status.needsConsent !== 'boolean'
  )
    return null;

  return {
    requiredVersion: status.requiredVersion,
    needsConsent: status.needsConsent,
  };
}
