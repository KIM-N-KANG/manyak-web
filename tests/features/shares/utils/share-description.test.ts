import { describe, expect, it } from 'vitest';

import {
  SHARE_DESCRIPTION_MAX_LENGTH,
  truncateForDescription,
} from '@/features/shares/utils/share-description';

describe('truncateForDescription', () => {
  it('짧은 문장은 그대로 둔다', () => {
    expect(truncateForDescription('짧은 프롤로그')).toBe('짧은 프롤로그');
  });

  it('긴 문장은 최대 길이에서 자르고 말줄임표를 붙인다', () => {
    const long = '가'.repeat(SHARE_DESCRIPTION_MAX_LENGTH + 20);
    const result = truncateForDescription(long);

    expect(result).toHaveLength(SHARE_DESCRIPTION_MAX_LENGTH + 1);
    expect(result.endsWith('…')).toBe(true);
  });

  it('최대 길이와 같으면 자르지 않는다', () => {
    const exact = '가'.repeat(SHARE_DESCRIPTION_MAX_LENGTH);

    expect(truncateForDescription(exact)).toBe(exact);
  });

  it('값이 없으면 빈 문자열을 준다', () => {
    expect(truncateForDescription(undefined)).toBe('');
  });

  it('앞뒤 공백과 줄바꿈은 정리한다', () => {
    expect(truncateForDescription('  첫 줄\n둘째 줄  ')).toBe('첫 줄 둘째 줄');
  });
});
