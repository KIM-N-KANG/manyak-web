'use client';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { track } from '@/observability/analytics';

import { useChatShare } from '../../hooks/use-chat-share';

type ChatShareDialogProps = {
  chatId: string;
  turnCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatShareDialog({
  chatId,
  turnCount,
  open,
  onOpenChange,
}: ChatShareDialogProps) {
  const { share, isSharing } = useChatShare(chatId, turnCount);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSharing) {
      return;
    }

    if (!nextOpen) {
      track('client_chatShareDialog_dismissed', {
        chat_id: chatId,
        turn_number: turnCount,
      });
    }

    onOpenChange(nextOpen);
  };

  const handleShare = async () => {
    const didShare = await share();

    if (didShare) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>이 채팅을 공유할까요?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            이 링크가 있으면 누구든지 내가 지금까지 이어온 채팅을 볼 수 있어요
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isSharing}
            onClick={() => handleOpenChange(false)}>
            나중에 하기
          </Button>
          <Button
            type="button"
            className="relative"
            disabled={isSharing}
            onClick={() => void handleShare()}>
            <LoadingButtonContent isLoading={isSharing} loadingLabel="복사 중">
              링크 복사하기
            </LoadingButtonContent>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
