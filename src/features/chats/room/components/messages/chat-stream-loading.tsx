import { TextShimmer } from '@/components/motion/text-shimmer';
import { Marker, MarkerContent } from '@/components/ui/marker';

export function ChatStreamLoading() {
  return (
    <Marker role="status">
      <MarkerContent className="min-h-lh" aria-label="답변을 작성하고 있어요">
        <TextShimmer duration={1.8} className="font-maruburi">
          작성 중
        </TextShimmer>
      </MarkerContent>
    </Marker>
  );
}
