'use client';

import { toast } from 'sonner';

import { useCreateChatShare } from '@/api/generated/endpoints/chats/chats';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { buildShareUrl } from '../utils/share-link';
import { classifyShareFailure } from '../utils/share-outcome';

/** 공유 시트에 함께 싣는 안내 문구. 링크만 보내면 무엇인지 알기 어렵다. */
const SHARE_TEXT = '마냑에서 만든 내 이야기를 보여줄게요';

/**
 * 채팅 공유 링크를 발급해 OS 공유 시트로 내보내는 훅.
 *
 * 발급은 멱등이라 같은 커트라인에서 다시 호출해도 같은 링크가 나온다. 다만 요청을
 * 아끼기 위해 진행 중 재호출은 막는다.
 *
 * `navigator.share`는 사용자 제스처 직후 약 5초(transient activation) 안에 호출해야
 * 하므로, 발급 응답이 느리면 창이 만료돼 실패할 수 있다. 그때는 클립보드 복사로
 * 떨어뜨려 링크가 사용자 손에 들어가게 한다.
 *
 * @param chatId 공유할 채팅 ID
 * @param turnCount 분석 이벤트에 실을 현재 진행 턴 수
 * @returns 공유 실행 함수와 진행 여부
 */
export function useChatShare(chatId: string, turnCount: number) {
  const { mutateAsync, isPending } = useCreateChatShare();

  const copyToClipboard = async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);

      return true;
    } catch {
      return false;
    }
  };

  const deliver = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: SHARE_TEXT, url });
        track('client_chat_share_succeeded', {
          chat_id: chatId,
          method: 'share_sheet',
        });

        return;
      } catch (error) {
        if (classifyShareFailure(error) === 'cancelled') {
          return;
        }
      }
    }

    if (await copyToClipboard(url)) {
      toast.success(TOAST_MESSAGE.CHAT_SHARE_LINK_COPIED);
      track('client_chat_share_succeeded', {
        chat_id: chatId,
        method: 'clipboard',
      });

      return;
    }

    toast.error(TOAST_MESSAGE.CHAT_SHARE_FAILED);
    track('client_chat_share_failed', {
      chat_id: chatId,
      reason: 'no_channel',
    });
  };

  const share = async () => {
    if (isPending) {
      return;
    }

    track('client_chat_shareButton_clicked', {
      chat_id: chatId,
      turn_number: turnCount,
    });

    let shareUrl: string;

    try {
      const response = await mutateAsync({ chatId });

      if (response.status !== 201 || !response.data.shareId) {
        throw new Error('공유 발급 응답에 shareId가 없습니다.');
      }

      shareUrl = buildShareUrl(response.data.shareId, window.location.origin);
    } catch {
      toast.error(TOAST_MESSAGE.CHAT_SHARE_FAILED);
      track('client_chat_share_failed', {
        chat_id: chatId,
        reason: 'issue_failed',
      });

      return;
    }

    await deliver(shareUrl);
  };

  return { share, isSharing: isPending };
}
