import { describe, expect, it } from 'vitest';

import { isStreamingTurnSuperseded } from '@/features/chats/room/utils/streaming-turn';

describe('isStreamingTurnSuperseded', () => {
  it('전송 시점보다 턴이 늘어났으면 대체된 것으로 판정한다', () => {
    expect(
      isStreamingTurnSuperseded(
        {
          userInput: '가자',
          segments: [{ type: 'text', content: '…' }],
          baseTurnCount: 3,
        },
        4,
      ),
    ).toBe(true);
  });

  it('턴 수가 전송 시점 그대로면 대체되지 않은 것으로 판정한다', () => {
    expect(
      isStreamingTurnSuperseded(
        {
          userInput: '가자',
          segments: [{ type: 'text', content: '…' }],
          baseTurnCount: 3,
        },
        3,
      ),
    ).toBe(false);
  });

  it('기준 턴 수가 없으면(재생성 등) 대체되지 않은 것으로 판정한다', () => {
    expect(
      isStreamingTurnSuperseded(
        { userInput: '가자', segments: [{ type: 'text', content: '…' }] },
        10,
      ),
    ).toBe(false);
  });
});
