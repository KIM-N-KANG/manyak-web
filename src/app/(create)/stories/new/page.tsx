import { StoryCreateHeader } from '@/features/stories/new/components/story-create-header';
import { StoryCreateTitle } from '@/features/stories/new/components/story-create-title';
import { StoryKeywordStepSection } from '@/features/stories/new/components/story-keyword-step-section';

export default function NewStoryPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <StoryCreateHeader />
      <StoryCreateTitle />
      <StoryKeywordStepSection />
    </div>
  );
}
