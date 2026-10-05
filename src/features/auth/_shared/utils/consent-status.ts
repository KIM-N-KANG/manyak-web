import type {
  UserConsentRequest,
  UserConsentResponse,
} from '@/api/generated/models';

/** 필수 동의 항목 키. 서버 응답·요청 필드와 같은 이름을 쓴다. */
export type ConsentKey = keyof UserConsentRequest;

/** 시트에 표시하는 순서. 만 14세 이상 확인 → 이용약관 → 개인정보 처리방침(Android와 동일). */
export const CONSENT_KEYS: readonly ConsentKey[] = [
  'age14',
  'terms',
  'privacy',
];

/** 현재 동의가 필요한 항목과 서버가 요구하는 버전. */
export type RequiredConsent = { key: ConsentKey; requiredVersion: string };

/**
 * 동의 조회 응답에서 아직 동의가 필요한 항목만 골라 낸다.
 * `needsConsent === true`인 항목만 필요로 보고, 버전이 없는 항목은 제출할 수 없으므로
 * 함께 필요 목록에 넣지 않는다(서버 계약상 필요 항목에는 항상 버전이 온다).
 *
 * @param response 동의 조회 응답(아직 없으면 undefined)
 * @returns 동의가 필요한 항목 목록(표시 순서)
 */
export function getRequiredConsents(
  response: UserConsentResponse | undefined,
): RequiredConsent[] {
  if (!response) {
    return [];
  }

  return CONSENT_KEYS.flatMap((key) => {
    const status = response[key];

    return status?.needsConsent === true && status.requiredVersion
      ? [{ key, requiredVersion: status.requiredVersion }]
      : [];
  });
}

/**
 * 응답에 동의가 필요한 항목이 하나라도 있는지 판정한다.
 *
 * @param response 동의 조회·기록 응답
 * @returns 필요 항목이 있으면 true
 */
export function hasPendingConsent(
  response: UserConsentResponse | undefined,
): boolean {
  return CONSENT_KEYS.some((key) => response?.[key]?.needsConsent === true);
}

/**
 * 체크한 항목이 필요 항목 전부를 덮는지 판정한다. 제출 버튼 활성 조건이다.
 *
 * @param required 동의가 필요한 항목
 * @param checked 사용자가 체크한 항목
 * @returns 필요 항목을 모두 체크했으면 true(필요 항목이 없으면 false)
 */
export function isEveryRequiredChecked(
  required: RequiredConsent[],
  checked: ReadonlySet<ConsentKey>,
): boolean {
  return required.length > 0 && required.every(({ key }) => checked.has(key));
}

/**
 * 기록 요청 본문을 만든다. 조회 응답의 `requiredVersion`을 그대로 싣고, 이미 동의한
 * 항목은 넣지 않는다(버전을 클라이언트에 고정하지 않는다).
 *
 * @param required 동의가 필요한 항목(조회 응답 기준)
 * @returns 필요 항목만 담은 기록 요청 본문
 */
export function buildConsentRequest(
  required: RequiredConsent[],
): UserConsentRequest {
  return Object.fromEntries(
    required.map(({ key, requiredVersion }) => [key, requiredVersion]),
  ) as UserConsentRequest;
}
