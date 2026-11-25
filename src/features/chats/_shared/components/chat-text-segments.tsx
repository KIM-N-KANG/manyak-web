import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

type ChatTextSegmentsProps = {
  children?: string;
};

/**
 * 마커를 해석한 텍스트 조각을 span으로 나열한다. 단일 `*...*` 는 보조색, `**...**` 는 굵게 그린다.
 * 블록 요소를 감싸지 않아 채팅 본문 문단과 선택지 버튼 안에서 함께 쓴다.
 */
export function ChatTextSegments({ children }: ChatTextSegmentsProps) {
  return parseTextSegments(children ?? '').map((segment, segmentIndex) => (
    <span
      key={segmentIndex}
      className={cn(
        segment.emphasis && 'text-foreground-secondary',
        segment.bold && 'font-bold',
      )}>
      {segment.text}
    </span>
  ));
}
