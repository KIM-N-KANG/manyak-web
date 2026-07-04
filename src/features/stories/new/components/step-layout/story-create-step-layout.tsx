import type { ReactNode, Ref } from 'react';

import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryCreateStepTitle } from './story-create-step-title';

type StoryCreateStepLayoutProps = {
  titleLines: readonly string[];
  description: string;
  footer: ReactNode;
  children: ReactNode;
  scrollAreaRef?: Ref<HTMLElement>;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryCreateStepLayout({
  titleLines,
  description,
  footer,
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

      <StoryCreateStepFooter>{footer}</StoryCreateStepFooter>
    </>
  );
}
