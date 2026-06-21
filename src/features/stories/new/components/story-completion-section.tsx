import { STORY_COMPLETION_LOADING_PHRASES } from '../constants';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryGeneratingLoading } from './story-generating-loading';

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
            스토리가 만들어지면 바로 채팅할 수 있어요
          </p>
        </div>

        <div className="p-4">
          <StoryGeneratingLoading
            phrases={STORY_COMPLETION_LOADING_PHRASES}
            label="스토리를 구상하고 있어요"
          />
        </div>
      </section>
    </StoryCreateStepScrollArea>
  );
}
