import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackMock = vi.fn();

vi.mock('@amplitude/unified', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

vi.mock('./config', () => ({ IS_ANALYTICS_ENABLED: true }));

import { deriveScreenName, track } from './client';

describe('deriveScreenName', () => {
  it('이벤트명 2번째 세그먼트를 screen_name으로 파생한다', () => {
    expect(deriveScreenName('client_storyCreate_completed')).toBe(
      'storyCreate',
    );
    expect(deriveScreenName('client_chat_viewed')).toBe('chat');
  });
});

describe('track (enabled)', () => {
  beforeEach(() => trackMock.mockClear());

  it('screen_name을 자동 부착해 amplitude.track을 호출한다', () => {
    track('client_chat_messageInput_submitted', {
      chat_id: 'c1',
      turn_number: 1,
    });
    expect(trackMock).toHaveBeenCalledWith(
      'client_chat_messageInput_submitted',
      {
        chat_id: 'c1',
        turn_number: 1,
        screen_name: 'chat',
      },
    );
  });

  it('프로퍼티 없는 이벤트도 screen_name만 부착해 호출한다', () => {
    track('client_storyList_viewed');
    expect(trackMock).toHaveBeenCalledWith('client_storyList_viewed', {
      screen_name: 'storyList',
    });
  });
});
