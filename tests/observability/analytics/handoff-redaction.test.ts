import { describe, expect, it } from 'vitest';

import { handoffRedactionPlugin } from '@/observability/analytics/handoff-redaction';

type PluginEvent = Parameters<
  NonNullable<typeof handoffRedactionPlugin.execute>
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

describe('handoffRedactionPlugin', () => {
  it('페이지뷰 URL 프로퍼티의 핸드오프 코드를 가린다', async () => {
    const event = createEvent({
      event_properties: {
        '[Amplitude] Page Location':
          'https://manyak.app/login/continue?handoff=secret-1',
        '[Amplitude] Page Path': '/login/continue',
      },
    });

    const result = (await handoffRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.event_properties).toEqual({
      '[Amplitude] Page Location':
        'https://manyak.app/login/continue?handoff=[redacted]',
      '[Amplitude] Page Path': '/login/continue',
    });
  });

  it('중첩된 user_properties(예: identify $set)도 훑는다', async () => {
    const event = createEvent({
      event_type: '$identify',
      user_properties: {
        $set: {
          referrer: 'https://manyak.app/login/continue?handoff=secret-1',
        },
      },
    });

    const result = (await handoffRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.user_properties).toEqual({
      $set: {
        referrer: 'https://manyak.app/login/continue?handoff=[redacted]',
      },
    });
  });

  it('코드가 없는 이벤트는 그대로 통과시킨다', async () => {
    const event = createEvent({
      event_properties: { trigger: 'story_create', count: 3 },
    });

    const result = (await handoffRedactionPlugin.execute?.(
      event,
    )) as PluginEvent;

    expect(result.event_properties).toEqual({
      trigger: 'story_create',
      count: 3,
    });
  });
});
