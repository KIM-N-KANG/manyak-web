import { describe, expect, it } from 'vitest';

import { buildShareUrl } from '@/features/chats/room/utils/share-link';

describe('buildShareUrl', () => {
  it('오리진과 공유 경로를 합쳐 절대 URL을 만든다', () => {
    expect(buildShareUrl('abc-123', 'https://manyak.app')).toBe(
      'https://manyak.app/share/abc-123',
    );
  });

  it('오리진 끝의 슬래시가 경로와 겹치지 않는다', () => {
    expect(buildShareUrl('abc-123', 'https://manyak.app/')).toBe(
      'https://manyak.app/share/abc-123',
    );
  });

  it('포트가 있는 로컬 오리진도 그대로 유지한다', () => {
    expect(buildShareUrl('abc-123', 'http://localhost:3000')).toBe(
      'http://localhost:3000/share/abc-123',
    );
  });
});
