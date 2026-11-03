'use client';

import { useState } from 'react';

import {
  Alert02Icon,
  BubbleChatAddIcon,
  Delete02Icon,
  MoreVerticalIcon,
  Share03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { OptionMenuButton } from '@/components/common/option-menu-button';
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
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { APP_PATH } from '@/constants/app-path';
import { useDeleteCreatedChat } from '@/features/chats/_shared/hooks/use-delete-created-chat';
import { CreditBalanceCard } from '@/features/my/menu/components/credit-balance-card';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { useStartChat } from '@/features/stories/_shared/hooks/use-start-chat';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useBackLayer } from '@/hooks/use-back-layer';
import { SPRING_LAYOUT } from '@/lib/ease';
import { returnToMainTab } from '@/lib/return-to-main-tab';
import { cn } from '@/lib/utils';

import { CHAT_MENU_COPY } from '../../constants';
import { useChatShare } from '../../hooks/use-chat-share';
import { useElementHeight } from '../../hooks/use-element-height';
import { ChatMenuCreditHistory } from './chat-menu-credit-history';

/**
 * 채팅방 헤더 메뉴 드로어의 props. 새 채팅·신고는 이 채팅이 참조하는 스토리가 대상이라
 * `storyId`를 받고, 참조 스토리가 삭제돼 ID가 없으면 두 항목을 두지 않는다.
 */
type ChatMenuDrawerProps = {
  chatId: string;
  storyId: string | null;
  turnCount: number;
};

export function ChatMenuDrawer({
  chatId,
  storyId,
  turnCount,
}: ChatMenuDrawerProps) {
  const router = useRouter();
  const { status } = useSession();
  const container = useAppFrameContainer();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'creditHistory'>('menu');
  const [hasReturnedToMenu, setHasReturnedToMenu] = useState(false);
  const [viewElement, setViewElement] = useState<HTMLDivElement | null>(null);
  const viewHeight = useElementHeight(viewElement);
  const reduceMotion = useReducedMotion();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { share, isSharing } = useChatShare(chatId, turnCount);
  const { deleteChat, isPending: isDeleting } = useDeleteCreatedChat(
    chatId,
    // 상세에서 시작한 방이면 상세도 함께 걷어내고 채팅 탭으로 간다.
    () => returnToMainTab(router, APP_PATH.MAIN.CHATS),
  );
  // 새 방이 지금 방을 대신해 뒤로가기로 이전 방에 돌아가지 않는다.
  const { startChat, isStarting } = useStartChat(storyId ?? '', {
    replace: true,
  });

  const canReport = status === 'authenticated' && storyId !== null;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setView('menu');
      setHasReturnedToMenu(false);
    }

    setIsOpen(open);
  };

  const returnToMenu = () => {
    setView('menu');
    setHasReturnedToMenu(true);
  };

  useBackLayer({
    open: isOpen && view === 'creditHistory',
    onBack: returnToMenu,
  });

  const handleShare = async () => {
    const didShare = await share();

    if (didShare) {
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    await deleteChat();
    setIsDeleteOpen(false);
  };

  return (
    <>
      <Drawer
        open={isOpen && container !== null}
        onOpenChange={handleOpenChange}>
        <DrawerTrigger
          render={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={CHAT_MENU_COPY.trigger}
            />
          }>
          <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
        </DrawerTrigger>
        <DrawerContent container={container} className="text-base">
          <m.div
            initial={false}
            animate={{ height: viewHeight ?? 'auto' }}
            transition={reduceMotion ? { duration: 0 } : SPRING_LAYOUT}
            className="flex min-h-0 flex-col overflow-hidden">
            <div ref={setViewElement} className="flex flex-col">
              {view === 'creditHistory' ? (
                <ChatMenuCreditHistory onBack={returnToMenu} />
              ) : (
                <div
                  className={cn(
                    'flex flex-col',
                    hasReturnedToMenu &&
                      'animate-in duration-300 fade-in-0 slide-in-from-left-6',
                  )}>
                  <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
                    <DrawerTitle className="text-xl leading-snug font-bold">
                      {CHAT_MENU_COPY.title}
                    </DrawerTitle>
                  </DrawerHeader>
                  <CreditBalanceCard
                    className="px-4 pt-4"
                    onHistoryClick={() => setView('creditHistory')}
                  />
                  {/* 항목은 카드 옵션 시트와 같은 버튼이다. 위 여백은 목록이 맡아 게스트(이프 카드 없음)에도 유지된다. */}
                  <div className="flex flex-col px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    {storyId !== null && (
                      <OptionMenuButton
                        icon={BubbleChatAddIcon}
                        label={CHAT_MENU_COPY.newChat}
                        onClick={startChat}
                        loading={isStarting}
                      />
                    )}
                    <OptionMenuButton
                      icon={Share03Icon}
                      label={CHAT_MENU_COPY.share}
                      onClick={() => void handleShare()}
                      loading={isSharing}
                    />
                    {/* 신고 시트·삭제 확인은 드로어와 별개의 모달이라 드로어를 먼저 닫고 연다.
                드로어 위에 다른 모달을 겹치면 바깥 탭 판정이 서로 얽힌다. */}
                    {canReport && (
                      <OptionMenuButton
                        icon={Alert02Icon}
                        label={CHAT_MENU_COPY.report}
                        onClick={() => {
                          setIsOpen(false);
                          setIsReportOpen(true);
                        }}
                      />
                    )}
                    <OptionMenuButton
                      icon={Delete02Icon}
                      label={CHAT_MENU_COPY.delete}
                      variant="destructive"
                      onClick={() => {
                        setIsOpen(false);
                        setIsDeleteOpen(true);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </m.div>
        </DrawerContent>
      </Drawer>

      {canReport && (
        <StoryReportSheet
          storyId={storyId}
          source="chat"
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteOpen(open);
          }
        }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {CHAT_MENU_COPY.deleteConfirm.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_MENU_COPY.deleteConfirm.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {CHAT_MENU_COPY.deleteConfirm.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              className="relative"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}>
              <LoadingButtonContent
                isLoading={isDeleting}
                loadingLabel={CHAT_MENU_COPY.deleteConfirm.pending}>
                {CHAT_MENU_COPY.deleteConfirm.confirm}
              </LoadingButtonContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
