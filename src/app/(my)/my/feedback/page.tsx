import { BackHeader } from '@/components/layout/back-header';
import { FeedbackForm } from '@/features/feedback/components/feedback-form';

export default function MyFeedbackPage() {
  return (
    <div className="flex h-svh min-h-0 flex-col">
      <BackHeader title="피드백" />
      <main className="flex min-h-0 flex-1 flex-col">
        <FeedbackForm />
      </main>
    </div>
  );
}
