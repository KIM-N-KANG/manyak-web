import type { ReactNode } from 'react';

import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryCreateStepTitle } from './story-create-step-title';

type StoryCreateStepLayoutProps = {
  titleLines: readonly string[];
  description: string;
  footer: ReactNode;
  children: ReactNode;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryCreateStepLayout({
  titleLines,
  description,
  footer,
  children,
  onScroll,
}: StoryCreateStepLayoutProps) {
  return (
    <StoryCreateStepScrollArea onScroll={onScroll}>
      <section className="flex flex-col">
        <StoryCreateStepTitle
          titleLines={titleLines}
          description={description}
          className="p-4"
        />
        {children}
      </section>

      <StoryCreateStepFooter>{footer}</StoryCreateStepFooter>
    </StoryCreateStepScrollArea>
  );
}
