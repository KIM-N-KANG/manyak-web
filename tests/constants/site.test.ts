import { describe, expect, it } from 'vitest';

import { formatDocumentTitle } from '@/constants/site';

describe('formatDocumentTitle', () => {
  it('화면 제목 뒤에 서비스명을 붙인다', () => {
    expect(formatDocumentTitle('용의 계곡')).toBe('용의 계곡 • 마냑');
  });

  it('제목이 비면 서비스명만 남긴다', () => {
    expect(formatDocumentTitle('')).toBe('마냑');
  });
});
