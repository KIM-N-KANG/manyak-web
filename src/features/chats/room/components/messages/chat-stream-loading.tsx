import { Marker, MarkerContent } from '@/components/ui/marker';

export function ChatStreamLoading() {
  return (
    <Marker role="status">
      <MarkerContent
        className="min-h-lh shimmer font-maruburi"
        aria-label="답변을 작성하고 있어요">
        작성 중
      </MarkerContent>
    </Marker>
  );
}
