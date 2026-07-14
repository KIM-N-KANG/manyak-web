'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useDeleteChat } from '@/api/generated/endpoints/chats/chats';
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  removeCreatedChatId,
  writeCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

type ChatDeleteConfirmDialogProps = {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatDeleteConfirmDialog({
  chatId,
  open,
  onOpenChange,
}: ChatDeleteConfirmDialogProps) {
  const router = useRouter();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useDeleteChat();
  const handleDelete = useOptimisticCreatedResourceDelete({
    id: chatId,
    isGuest: status !== 'authenticated',
    getSnapshot: getCreatedChatIdsSnapshot,
    parseSnapshot: parseCreatedChatIds,
    removeId: removeCreatedChatId,
    writeIds: writeCreatedChatIds,
    invalidateServerLists: () =>
      void queryClient.invalidateQueries({
        queryKey: getGetMyChatsQueryKey(),
      }),
    deleteResource: () => mutateAsync({ chatId }),
    successMessage: TOAST_MESSAGE.CHAT_DELETED,
    failureMessage: TOAST_MESSAGE.CHAT_DELETE_FAILED,
    onDeleteSuccess: () => router.replace(APP_PATH.MAIN.CHATS),
  });

  const handleConfirmDelete = async () => {
    await handleDelete();
    onOpenChange(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) {
          return;
        }

        onOpenChange(nextOpen);
      }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>채팅을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            삭제하면 목록에서 사라지며 되돌릴 수 없어요
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>남겨두기</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirmDelete();
            }}>
            {isPending && <Spinner aria-hidden="true" />}
            삭제하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
