import { StoryCompletionLoadingState } from './story-completion-loading-state';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';

type StoryCompletionSectionProps = {
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryCompletionSection({
  onScroll,
}: StoryCompletionSectionProps) {
  return (
    <StoryCreateStepScrollArea onScroll={onScroll} aria-busy className="pb-4">
      <section className="flex flex-1 flex-col">
        <div className="flex flex-col gap-1 p-4">
          <h1 className="text-xl font-semibold">
            <span className="block">스토리를 만들고 있어요</span>
            <span className="block">잠시만 기다려 주세요</span>
          </h1>
          <p className="text-foreground-secondary">
            모든 정보를 바탕으로 스토리를 구상하고 있어요
          </p>
        </div>

        <div className="p-4">
          <StoryCompletionLoadingState />
        </div>
      </section>
    </StoryCreateStepScrollArea>
  );
}
