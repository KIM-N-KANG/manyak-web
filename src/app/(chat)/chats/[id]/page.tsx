type ChatRoomPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { id } = await params;

  return <div>Chat Room {id}</div>;
}
