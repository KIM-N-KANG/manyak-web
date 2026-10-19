import { describe, expect, it } from 'vitest';

import { shareIdRedactionPlugin } from '@/observability/analytics/share-id-redaction';

type PluginEvent = Parameters<
  NonNullable<typeof shareIdRedactionPlugin.execute>
>[0];

/**
 * 플러그인에 넘길 최소 이벤트를 만든다.
 *
 * @param overrides 덮어쓸 이벤트 필드
 * @returns 테스트용 이벤트
 */
function createEvent(overrides: Partial<PluginEvent>): PluginEvent {
  return { event_type: '[Amplitude] Page Viewed', ...overrides } as PluginEvent;
}

describe('shareIdRedactionPlugin', () => {
  it('페이지뷰 URL 프로퍼티의 공유 열람 토큰을 가린다', async () => {
    const event = createEvent({
      event_properties: {
        '[Amplitude] Page Location': 'https://manyak.app/share/secret-1',
        '[Amplitude] Page Path': '/share/secret-1',
      },
    });

    const result = (await shareIdRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.event_properties).toEqual({
      '[Amplitude] Page Location': 'https://manyak.app/share/[redacted]',
      '[Amplitude] Page Path': '/share/[redacted]',
    });
  });

  it('중첩된 user_properties(예: identify $set)도 훑는다', async () => {
    const event = createEvent({
      event_type: '$identify',
      user_properties: {
        $set: {
          referrer: 'https://manyak.app/share/secret-1',
        },
      },
    });

    const result = (await shareIdRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.user_properties).toEqual({
      $set: {
        referrer: 'https://manyak.app/share/[redacted]',
      },
    });
  });

  it('토큰이 없는 이벤트는 그대로 통과시킨다', async () => {
    const event = createEvent({
      event_properties: { trigger: 'story_create', count: 3 },
    });

    const result = (await shareIdRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.event_properties).toEqual({
      trigger: 'story_create',
      count: 3,
    });
  });
});
