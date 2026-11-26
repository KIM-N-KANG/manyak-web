import type { ReactNode, Ref } from 'react';

import { StepFooter } from '@/components/common/step-footer';

import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryCreateStepTitle } from './story-create-step-title';

type StoryCreateStepLayoutProps = {
  titleLines: readonly string[];
  description: string;
  /** 하단 버튼 줄. 없으면 푸터 전체를 그리지 않는다. */
  footer?: ReactNode;
  /** 푸터 맨 위에 좌우 여백 없이 놓는 영역. `footer`가 있을 때만 보인다. */
  footerTop?: ReactNode;
  /** 버튼 바로 위에 좌우 여백을 두고 놓는 안내 문구. `footer`가 있을 때만 보인다. */
  footerMessage?: ReactNode;
  children: ReactNode;
  /** 제목과 본문을 담은 스크롤 영역. 단계가 본문을 맨 위로 올릴 때 쓴다. */
  scrollAreaRef?: Ref<HTMLElement>;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryCreateStepLayout({
  titleLines,
  description,
  footer,
  footerTop,
  footerMessage,
  children,
  scrollAreaRef,
  onScroll,
}: StoryCreateStepLayoutProps) {
  return (
    <>
      <StoryCreateStepScrollArea
        scrollAreaRef={scrollAreaRef}
        onScroll={onScroll}>
        <section className="flex flex-col">
          <StoryCreateStepTitle
            titleLines={titleLines}
            description={description}
            className="p-4"
          />
          {children}
        </section>
      </StoryCreateStepScrollArea>

      {footer != null && (
        <StepFooter top={footerTop} message={footerMessage}>
          {footer}
        </StepFooter>
      )}
    </>
  );
}
