'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { m, useReducedMotion } from 'motion/react';

import { MascotStage } from '@/components/common/mascot-stage';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/constants/site';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useBackLayer } from '@/hooks/use-back-layer';

import {
  CREATE_TUTORIAL_COPY,
  type CreateTutorialStage,
  getCreateTutorialMessage,
} from '../constants/create-tutorial';
import { drawTutorialMascotStage } from '../utils/draw-tutorial-mascot-stage';

type CreateTutorialDialogProps = {
  stage: CreateTutorialStage;
  /** 스토리라인 단계 문구에 넣을 장르 이름 */
  genres?: readonly string[];
  onPrimary: () => void;
  onSecondary: () => void;
};

/** 단계별 선택지 문구다. 보조 선택지가 없는 단계는 확인 하나만 둔다. */
function getChoiceLabels(stage: CreateTutorialStage) {
  if (stage === 'intro')
    return {
      primary: CREATE_TUTORIAL_COPY.start,
      secondary: CREATE_TUTORIAL_COPY.skip,
    };

  if (stage === 'completing')
    return {
      primary: CREATE_TUTORIAL_COPY.originals,
      secondary: CREATE_TUTORIAL_COPY.close,
    };

  return { primary: CREATE_TUTORIAL_COPY.confirm, secondary: null };
}

/**
 * 간편 제작 첫 진입 안내 대화창. 화면 하단에 떠 있는 카드 안에서 좌상단 프로필의 마스코트가 이름과 함께
 * 말을 건네고, 버튼은 채팅 첫 진입 안내처럼 오른쪽 아래에 작게 둔다. 앱 프레임 전체를 딤으로 덮으며, 뒤로가기는 보조 버튼(없으면
 * 확인)과 같다. 열려 있을 때만 마운트한다.
 */
export function CreateTutorialDialog({
  stage,
  genres,
  onPrimary,
  onSecondary,
}: CreateTutorialDialogProps) {
  const container = useAppFrameContainer();
  const reduceMotion = useReducedMotion();
  const messageId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const labels = getChoiceLabels(stage);

  // 초점은 버튼 대신 카드에 둔다. 버튼에 두면 터치 기기에서도 초점 링이 남아 눌린 것처럼 보인다.
  useEffect(() => {
    cardRef.current?.focus();
  }, [container, stage]);

  useBackLayer({
    open: true,
    onBack: labels.secondary === null ? onPrimary : onSecondary,
  });

  if (container === null) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={CREATE_TUTORIAL_COPY.label}
      aria-describedby={messageId}
      className="absolute inset-0 z-60 flex flex-col justify-end bg-black/50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <m.section
        ref={cardRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-[20px] bg-background p-4 outline-none dark:border dark:border-border">
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className="size-12 shrink-0 overflow-hidden rounded-full bg-primary/10">
            <MascotStage
              label={CREATE_TUTORIAL_COPY.mascot}
              draw={drawTutorialMascotStage}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              aria-hidden="true"
              className="text-sm font-semibold text-primary">
              {SITE_NAME}
            </p>
            <m.p
              key={stage}
              id={messageId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-1 text-base leading-6 whitespace-pre-line text-foreground">
              {getCreateTutorialMessage(stage, genres)}
            </m.p>
          </div>
        </div>
        {/* 채팅 첫 진입 안내와 같은 버튼 구성이되 크기는 기본이다. */}
        <div className="mt-4 flex items-center justify-end gap-1">
          {labels.secondary !== null && (
            <Button type="button" variant="ghost" onClick={onSecondary}>
              {labels.secondary}
            </Button>
          )}
          <Button type="button" onClick={onPrimary}>
            {labels.primary}
          </Button>
        </div>
      </m.section>
    </div>,
    container,
  );
}
