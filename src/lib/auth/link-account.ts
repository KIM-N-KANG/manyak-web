import {
  isSocialLoginProvider,
  type SocialLoginProvider,
} from './social-provider';

/** 연동 전용 NextAuth 프로바이더 id 접두사. 로그인 프로바이더와 콜백 처리를 분리한다. */
const LINK_PROVIDER_ID_PREFIX = 'link-';

/** 재인증으로 발급된 링크 코드를 연동 단계까지 보관하는 httpOnly 쿠키 이름. */
export const LINK_CODE_COOKIE = 'manyak_link_code';

/** 연동 결과를 마이 페이지에 전달하는 클라이언트 판독용 쿠키 이름. */
export const LINK_RESULT_COOKIE = 'manyak_link_result';

/** 연동 플로우의 최종 결과 코드. 백엔드 409 2종(스펙 §4-5)을 구분해 담는다. */
export type LinkAccountResult =
  | 'success'
  | 'provider_already_linked'
  | 'linked_to_other_user'
  | 'reauth_failed'
  | 'error';

export type LinkResultPayload = {
  /** 연동 플로우의 최종 결과. */
  result: LinkAccountResult;
  /** 연동을 시도한 대상 provider. */
  provider: SocialLoginProvider;
};

const LINK_ACCOUNT_RESULTS: readonly LinkAccountResult[] = [
  'success',
  'provider_already_linked',
  'linked_to_other_user',
  'reauth_failed',
  'error',
];

/**
 * provider를 연동 전용 NextAuth 프로바이더 id로 변환한다.
 *
 * @param provider 연동에 사용할 소셜 provider
 * @returns 연동 전용 NextAuth 프로바이더 id
 */
export function toLinkProviderId(provider: SocialLoginProvider): string {
  return `${LINK_PROVIDER_ID_PREFIX}${provider}`;
}

/**
 * NextAuth 프로바이더 id가 연동 전용 변형이면 원 provider를, 아니면 null을 반환한다.
 *
 * @param id NextAuth account.provider 값
 * @returns 연동 전용 변형이면 원 provider, 아니면 null
 */
export function parseLinkProviderId(id: string): SocialLoginProvider | null {
  if (!id.startsWith(LINK_PROVIDER_ID_PREFIX)) {
    return null;
  }

  const provider = id.slice(LINK_PROVIDER_ID_PREFIX.length);

  return isSocialLoginProvider(provider) ? provider : null;
}

/**
 * 연동 결과 페이로드를 쿠키 값 문자열로 직렬화한다. 쿠키 구분자가 값에 남지 않도록
 * URI 인코딩한다.
 *
 * @param payload 직렬화할 연동 결과 페이로드
 * @returns 쿠키 값으로 쓸 인코딩된 문자열
 */
export function serializeLinkResult(payload: LinkResultPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * 쿠키 값 문자열을 연동 결과 페이로드로 파싱한다. 손상·미지 값은 null이다.
 *
 * @param raw 쿠키에서 읽은 값 문자열
 * @returns 파싱된 연동 결과 페이로드, 손상·미지 값이면 null
 */
export function parseLinkResult(raw: string): LinkResultPayload | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { result, provider } = parsed as {
      result?: unknown;
      provider?: unknown;
    };

    if (!isSocialLoginProvider(provider)) {
      return null;
    }

    if (!LINK_ACCOUNT_RESULTS.includes(result as LinkAccountResult)) {
      return null;
    }

    return { result: result as LinkAccountResult, provider };
  } catch {
    return null;
  }
}
