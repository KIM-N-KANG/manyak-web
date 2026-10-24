import assert from 'node:assert/strict';
import { test } from 'vitest';

import { resolveNotificationPath } from '@/features/notifications/inbox/utils/notification-link';

test('운영 origin의 deepLink는 상대 경로로 바꾼다', () => {
  assert.equal(
    resolveNotificationPath({
      deepLink: 'https://manyak.app/my/credits?tab=free',
      noticeId: null,
      storyId: null,
    }),
    '/my/credits?tab=free',
  );
});

test('현재 origin의 deepLink도 허용한다', () => {
  assert.equal(
    resolveNotificationPath(
      {
        deepLink: 'http://localhost:3000/studio',
        noticeId: null,
        storyId: null,
      },
      'http://localhost:3000',
    ),
    '/studio',
  );
});

test('허용하지 않는 origin이면 공지 ID, 스토리 ID 순으로 대체한다', () => {
  assert.equal(
    resolveNotificationPath({
      deepLink: 'https://evil.example/notices/n1',
      noticeId: 'n1',
      storyId: 's1',
    }),
    '/notices/n1',
  );
  assert.equal(
    resolveNotificationPath({ deepLink: null, noticeId: null, storyId: 's1' }),
    '/stories/s1',
  );
});

test('갈 곳이 없으면 null이다', () => {
  assert.equal(
    resolveNotificationPath({ deepLink: null, noticeId: null, storyId: null }),
    null,
  );
});
