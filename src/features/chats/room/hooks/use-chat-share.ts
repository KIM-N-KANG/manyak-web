'use client';

import { toast } from 'sonner';

import { useCreateChatShare } from '@/api/generated/endpoints/chats/chats';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { buildShareUrl } from '../utils/share-link';

/**
 * 채팅 공유 링크를 발급해 클립보드에 복사하는 훅.
 *
 * 발급은 멱등이라 같은 커트라인에서 다시 호출해도 같은 링크가 나온다. 다만 요청을
 * 아끼기 위해 진행 중 재호출은 막는다.
 *
 * 발급·복사 어느 단계든 실패하면 실패 토스트 하나로 안내한다. 사용자 입장에서는
 * "링크가 손에 없다"는 같은 결과이기 때문이다.
 *
 * @param chatId 공유할 채팅 ID
 * @param turnCount 분석 이벤트에 실을 현재 진행 턴 수
 * @returns 공유 실행 함수(성공 여부 반환)와 진행 여부
 */
export function useChatShare(chatId: string, turnCount: number) {
  const { mutateAsync, isPending } = useCreateChatShare();

  const share = async () => {
    if (isPending) {
      return false;
    }

    track('client_chat_shareButton_clicked', {
      chat_id: chatId,
      turn_number: turnCount,
    });

    try {
      const response = await mutateAsync({ chatId });

      if (response.status !== 201 || !response.data.shareId) {
        throw new Error('공유 발급 응답에 shareId가 없습니다.');
      }

      const shareUrl = buildShareUrl(
        response.data.shareId,
        window.location.origin,
      );

      await navigator.clipboard.writeText(shareUrl);
    } catch {
      toast.error(TOAST_MESSAGE.CHAT_SHARE_FAILED);

      return false;
    }

    toast.success(TOAST_MESSAGE.CHAT_SHARE_LINK_COPIED);

    return true;
  };

  return { share, isSharing: isPending };
}
