'use client';

import {
  getChatDetail,
  useGetChatDetail,
} from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';

/**
 * 채팅 상세(참조 스토리 ID와 제목, 프롤로그, 턴 목록, 추천 입력, 채팅 모델)를 조회하는 훅
 *
 * `isForbidden`은 게스트-회원 교차 접근 차단(백엔드 §4-5)에 걸린 상태다. 게스트가 만든
 * 채팅(`user_id` NULL)은 회원 요청에 403이며, 이관으로 소유권이 옮겨져야 열린다. 이관 창이
 * 닫힌 계정에서는 영구적이라 재시도로 풀리지 않으므로 일반 오류와 구분해 다룬다.
 *
 * @param chatId 조회할 채팅 ID
 * @returns 스토리 ID와 제목, 프롤로그, 턴 목록, 추천 입력, 채팅 모델 코드(서버가 주지 않으면 undefined), 생성 중인 턴(없으면 null)과 로딩, 에러,
 *   차단 상태, refetch와 새 응답을 돌려주는 reload 함수. 참조 스토리가 삭제되면 서버가 제목을 비워 보내므로 `storyId`도 null로 정리한다
 */
export function useChatDetail(chatId: string) {
  const query = useGetChatDetail(chatId, {
    query: {
      // StrictMode 이중 마운트로 상세가 두 번 조회되지 않도록 abort signal을
      // 전달하지 않는다. 배경은 queryFnWithoutAbortSignal 문서 참고.
      queryFn: queryFnWithoutAbortSignal(() => getChatDetail(chatId)),
      // 나가 있는 동안 서버가 생성을 이어 가므로, 들어올 때마다 캐시 대신 새 상세로 생성 중인 턴과 저장된 턴을 확인한다.
      refetchOnMount: 'always',
    },
  });
  const detail = query.data?.status === 200 ? query.data.data : undefined;
  const isForbidden =
    query.error instanceof FetchError && query.error.status === 403;

  const storyTitle = detail?.storyTitle?.trim() ?? '';

  /**
   * 상세를 다시 조회해 새 응답을 돌려준다. 실패하면 undefined다.
   * 실패한 재조회도 직전 데이터를 남기므로 결과 상태로 가려 낡은 응답을 새 응답으로 쓰지 않는다.
   */
  const reload = async () => {
    const result = await query.refetch();

    return result.status === 'success' && result.data.status === 200
      ? result.data.data
      : undefined;
  };

  return {
    storyId: storyTitle && detail?.storyId ? detail.storyId : null,
    storyTitle,
    prologue: detail?.prologue ?? '',
    turns: (detail?.turns ?? []) as ChatTurnResponse[],
    suggestedInputs: detail?.suggestedInputs ?? [],
    model: detail?.model,
    generatingTurn: detail?.generatingTurn ?? null,
    // 캐시가 있어도 들어온 뒤 새로 받기 전까지는 로딩으로 두어, 낡은 화면에서 보내거나 고르지 않게 한다.
    isLoading: query.isPending || !query.isFetchedAfterMount,
    isError: query.isError,
    isForbidden,
    refetch: query.refetch,
    reload,
  };
}
