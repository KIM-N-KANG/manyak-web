import type { PublicNoticeItemResponseTag } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { NOTICE_TAG_LABEL } from '../constants';

type NoticeTagBadgeProps = {
  tag: PublicNoticeItemResponseTag | null | undefined;
  className?: string;
};

/**
 * 공지 태그 배지. 점검만 주의색으로 띄우고 나머지는 보조 배지로 둔다.
 * 모르는 값(서버가 태그를 더하면)은 그리지 않는다.
 */
export function NoticeTagBadge({ tag, className }: NoticeTagBadgeProps) {
  if (!tag || !(tag in NOTICE_TAG_LABEL)) return null;

  return (
    <Badge
      variant={tag === 'MAINTENANCE' ? 'destructive' : 'secondary'}
      className={cn('font-semibold', className)}>
      {NOTICE_TAG_LABEL[tag]}
    </Badge>
  );
}
