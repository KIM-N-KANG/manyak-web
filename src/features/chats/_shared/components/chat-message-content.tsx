import { cn } from '@/lib/utils';

import { ChatTextSegments } from './chat-text-segments';

type ChatMessageContentProps = {
  children?: string;
  className?: string;
};

/**
 * 채팅 텍스트 한 덩어리를 그리는 문단. `*...*`(상황, 속마음)와 `**...**`(굵게) 마커를
 * 스타일로 바꾸고 `whitespace-pre-wrap` 으로 원문 줄바꿈을 보존한다.
 *
 * @see parseTextSegments
 */
export function ChatMessageContent({
  children,
  className,
}: ChatMessageContentProps) {
  return (
    <p
      className={cn(
        'font-maruburi text-base leading-7 whitespace-pre-wrap',
        className,
      )}>
      <ChatTextSegments>{children}</ChatTextSegments>
    </p>
  );
}
