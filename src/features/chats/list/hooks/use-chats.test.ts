import { describe, expect, it } from 'vitest';

import type { ChatSummaryResponse } from '@/api/generated/models';

import { toChatListItems } from './use-chats';

const makeChat = (
  id: string,
  updatedAt: string,
): Required<ChatSummaryResponse> => ({
  id,
  storyId: 'story-1',
  storyTitle: `story-${id}`,
  lastStoryPreview: `preview-${id}`,
  chatCount: 0,
  updatedAt,
});

describe('toChatListItems', () => {
  it('서버가 준 최신순 응답 순서를 그대로 보존한다', () => {
    // 서버는 마지막 활동(updatedAt) 최신순(c, a, b)으로 응답한다.
    const serverChats = [
      makeChat('c', '2026-06-22T10:00:00Z'),
      makeChat('a', '2026-06-21T10:00:00Z'),
      makeChat('b', '2026-06-20T10:00:00Z'),
    ];

    const result = toChatListItems(serverChats);

    expect(result.map((chat) => chat.id)).toEqual(['c', 'a', 'b']);
  });

  it('필수 필드가 누락된 항목은 제외한다', () => {
    const incomplete = { id: 'x', storyId: 'story-1' } as ChatSummaryResponse;
    const serverChats = [makeChat('a', '2026-06-22T10:00:00Z'), incomplete];

    const result = toChatListItems(serverChats);

    expect(result.map((chat) => chat.id)).toEqual(['a']);
  });
});
