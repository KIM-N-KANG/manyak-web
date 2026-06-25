import { ChatRoom } from '@/features/chats/room/components/chat-room';

type ChatRoomPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { id } = await params;

  return <ChatRoom chatId={id} />;
}
