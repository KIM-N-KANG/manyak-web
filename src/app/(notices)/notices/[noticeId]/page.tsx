import type { Metadata } from 'next';

import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { NOTICE_COPY } from '@/features/notices/_shared/constants';
import { NoticeDetailScreen } from '@/features/notices/detail/components/notice-detail-screen';

type NoticeDetailPageProps = {
  params: Promise<{ noticeId: string }>;
};

export const metadata: Metadata = {
  title: NOTICE_COPY.title,
};

export default async function NoticeDetailPage({
  params,
}: NoticeDetailPageProps) {
  const { noticeId } = await params;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 푸시 딥링크로 바로 열면 뒤로가기가 공지 목록으로 간다. */}
      <BackHeader title={NOTICE_COPY.title} fallbackHref={APP_PATH.NOTICES} />
      <NoticeDetailScreen noticeId={noticeId} />
    </div>
  );
}
