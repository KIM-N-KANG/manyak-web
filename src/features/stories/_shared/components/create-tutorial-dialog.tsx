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
  /** 주 선택지. 보조 선택지가 없는 단계에서는 뒤로가기도 이 동작으로 처리한다. */
  onPrimary: () => void;
  /** 보조 선택지(건너뛰기, 닫기). 보조 선택지가 있는 단계에서 뒤로가기도 이 동작이다. */
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
 * 간편 제작 첫 진입 안내 대화창.
 *
 * @remarks
 * 앱 프레임에 포털해 프레임 안에서만 화면을 덮는다. 뒤로가기 레이어를 등록해 브라우저 뒤로가기를 선택지로
 * 처리하고, 포털 대상이 정해지거나 단계가 바뀔 때마다 카드로 포커스를 옮긴다.
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
      className="absolute inset-0 z-60 flex flex-col justify-center bg-black/50 p-3">
      <m.section
        ref={cardRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
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
