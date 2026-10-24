import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { NOTICE_COPY } from '@/features/notices/_shared/constants';
import { NoticeListScreen } from '@/features/notices/list/components/notice-list-screen';

export default function NoticesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={NOTICE_COPY.title}
        fallbackHref={APP_PATH.MAIN.STORIES}
      />
      <NoticeListScreen />
    </div>
  );
}
