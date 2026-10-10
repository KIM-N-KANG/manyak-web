import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { FeedbackForm } from '@/features/my/feedback/components/feedback-form';

export default function MyFeedbackPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="피드백" fallbackHref={APP_PATH.MAIN.MY} />
      <main className="flex min-h-0 flex-1 flex-col">
        <FeedbackForm />
      </main>
    </div>
  );
}
