import { StoryDetail } from '@/features/stories/detail/components/story-detail';

type StoryDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoryDetailPage({
  params,
}: StoryDetailPageProps) {
  const { id } = await params;

  return <StoryDetail storyId={id} />;
}
