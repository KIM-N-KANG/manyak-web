import { OnboardingDialog } from '@/features/onboarding/components/onboarding-dialog';
import { StoryList } from '@/features/stories/list/components/story-list';

export default function StoriesPage() {
  return (
    <main className="flex flex-1 flex-col">
      <StoryList />
      <OnboardingDialog />
    </main>
  );
}
