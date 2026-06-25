import Link from 'next/link';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

export default function NotFound() {
  return (
    <ListStatus
      title="페이지를 찾을 수 없어요"
      description="요청하신 페이지가 존재하지 않거나 이동되었어요">
      <Button
        nativeButton={false}
        render={<Link href={APP_PATH.MAIN.STORIES} />}
        size="lg">
        홈으로 돌아가기
      </Button>
    </ListStatus>
  );
}
