import Link from 'next/link';

import { GoBackButton } from '@/components/common/go-back-button';
import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { NOT_FOUND_COPY } from '@/constants/not-found';

export default function NotFound() {
  return (
    <ListStatus
      title={NOT_FOUND_COPY.title}
      description={NOT_FOUND_COPY.description}>
      <div className="flex flex-col items-center gap-2">
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.MAIN.STORIES} />}
          size="lg">
          {NOT_FOUND_COPY.home}
        </Button>
        <GoBackButton />
      </div>
    </ListStatus>
  );
}
