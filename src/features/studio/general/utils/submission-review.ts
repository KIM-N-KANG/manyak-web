/** 검수 제출본 조회 응답에서 등록 흐름이 쓰는 값만 읽는다. 생성 타입이 느슨한 객체라 직접 좁힌다. */

export type SubmissionReview =
  | { status: 'PENDING' }
  | { status: 'APPROVED'; storyId: string }
  | { status: 'REJECTED' | 'FAILED' };

/**
 * `GET /stories/submissions/{submissionId}` 응답을 검수 결과로 바꾼다.
 * 승인됐는데 스토리 id가 없거나 알 수 없는 상태는 아직 끝나지 않은 것으로 보고 다시 조회하게 한다.
 *
 * @param data 제출본 상세 응답 본문
 * @returns 검수 결과
 */
export function readSubmissionReview(data: unknown): SubmissionReview {
  const { status, storyId } = (data ?? {}) as Record<string, unknown>;

  if (status === 'APPROVED' && typeof storyId === 'string' && storyId) {
    return { status, storyId };
  }

  if (status === 'REJECTED' || status === 'FAILED') {
    return { status };
  }

  return { status: 'PENDING' };
}
