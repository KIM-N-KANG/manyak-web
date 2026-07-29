import { describe, expect, it } from 'vitest';

import { redactShareId } from '@/lib/shares/share-url-redaction';

describe('redactShareId', () => {
  it('절대 URL의 공유 식별자를 가린다', () => {
    expect(redactShareId('https://manyak.app/share/abc-123')).toBe(
      'https://manyak.app/share/[redacted]',
    );
  });

  it('상대 경로도 가린다', () => {
    expect(redactShareId('/share/abc-123')).toBe('/share/[redacted]');
  });

  it('쿼리와 해시는 남기고 식별자만 가린다', () => {
    expect(redactShareId('/share/abc-123?utm_source=kakao#top')).toBe(
      '/share/[redacted]?utm_source=kakao#top',
    );
  });

  it('공유 경로가 없으면 원문 그대로 둔다', () => {
    expect(redactShareId('https://manyak.app/chats/c1')).toBe(
      'https://manyak.app/chats/c1',
    );
  });

  it('백엔드 API 경로의 식별자도 가린다(api_url 태그 누출 방지)', () => {
    expect(redactShareId('https://api.manyak.app/api/v1/shares/abc-123')).toBe(
      'https://api.manyak.app/api/v1/shares/[redacted]',
    );
  });

  it('발급 경로(/chats/{id}/shares)는 뒤에 식별자가 없어 그대로 둔다', () => {
    expect(redactShareId('/api/v1/chats/c1/shares')).toBe(
      '/api/v1/chats/c1/shares',
    );
  });
});
