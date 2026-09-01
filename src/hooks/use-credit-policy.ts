'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  type getCreditPoliciesResponse,
  getGetCreditPoliciesQueryKey,
  useGetCreditPolicies,
} from '@/api/generated/endpoints/credits/credits';
import type { CreditPolicyResponse } from '@/api/generated/models';

/** 조회 응답에서 정책 본문만 꺼낸다. 성공(200)이 아니면 값이 없는 것으로 본다. */
const toPolicy = (
  response: getCreditPoliciesResponse | undefined,
): CreditPolicyResponse | undefined =>
  response?.status === 200 ? response.data : undefined;

/**
 * 서버가 내려주는 이프 적립·소모 수치를 구독하는 훅.
 *
 * 인증이 필요 없는 공개 조회라 게스트 화면에서도 쓸 수 있다. 서버는 정책 스냅샷을
 * 약 1분 주기로 갱신하므로 쿼리 기본 staleTime(1분)을 그대로 쓴다.
 *
 * 값을 못 받았을 때 대신 쓸 기본 수치를 두지 않는다 — 클라이언트가 들고 있는 수치는
 * 서버가 값을 바꾸는 순간 거짓이 되기 때문이다. 대신 화면은 자리표시 숫자를 쉬머와 함께 그린다.
 *
 * @returns 이프 정책 수치. 아직 받지 못했거나 조회에 실패하면 `undefined`다.
 */
export function useCreditPolicy(): CreditPolicyResponse | undefined {
  const { data } = useGetCreditPolicies();

  return toPolicy(data);
}

/**
 * 이프 정책을 이벤트가 일어난 시점에 한 번만 읽는 함수를 돌려주는 훅.
 *
 * 토스트 문구나 카카오 공유 제목처럼 값이 뒤늦게 도착해도 다시 그릴 필요가 없는 자리에서 쓴다.
 * 이런 자리에서 {@link useCreditPolicy}로 구독하면 정책이 도착할 때 그 훅을 쓰는 폼까지 다시 그려져
 * 입력 중이던 값이 흔들린다. 조회 자체는 같은 화면의 다른 곳이 이미 구독하고 있어 캐시에 채워진다.
 *
 * @returns 호출 시점의 이프 정책 수치를 돌려주는 함수
 */
export function useCreditPolicySnapshot() {
  const queryClient = useQueryClient();

  return () =>
    toPolicy(
      queryClient.getQueryData<getCreditPoliciesResponse>(
        getGetCreditPoliciesQueryKey(),
      ),
    );
}
