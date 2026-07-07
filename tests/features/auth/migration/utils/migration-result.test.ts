import { describe, expect, it } from 'vitest';

import { countMigrated } from '@/features/auth/migration/utils/migration-result';

describe('countMigrated', () => {
  it('MIGRATED 상태만 센다', () => {
    expect(
      countMigrated({
        stories: [
          { id: 'a', status: 'MIGRATED' },
          { id: 'b', status: 'ALREADY_OWNED' },
          { id: 'c', status: 'NOT_FOUND' },
        ],
        chats: [{ id: 'd', status: 'MIGRATED' }],
      }),
    ).toEqual({ storyCount: 1, chatCount: 1 });
  });

  it('빈 응답은 0으로 센다', () => {
    expect(countMigrated({})).toEqual({ storyCount: 0, chatCount: 0 });
  });
});
