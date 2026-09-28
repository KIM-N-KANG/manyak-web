import { describe, expect, it } from 'vitest';

import { getDuplicateNameIds } from '@/features/studio/general/utils/duplicate-name';

describe('getDuplicateNameIds', () => {
  it('앞뒤 공백을 뺀 이름이 앞 항목과 같으면 뒤 항목만 고른다', () => {
    const ids = getDuplicateNameIds([
      { id: 'a', name: '도하람의 장부' },
      { id: 'b', name: ' 도하람의 장부 ' },
      { id: 'c', name: '첫차' },
      { id: 'd', name: '도하람의 장부' },
    ]);

    expect([...ids]).toEqual(['b', 'd']);
  });

  it('안쪽 공백·대소문자가 다르면 다른 이름이고, 빈 이름은 보지 않는다', () => {
    const ids = getDuplicateNameIds([
      { id: 'a', name: '도하람의 장부' },
      { id: 'b', name: '도하람의장부' },
      { id: 'c', name: 'Key' },
      { id: 'd', name: 'key' },
      { id: 'e', name: '  ' },
      { id: 'f', name: '' },
    ]);

    expect(ids.size).toBe(0);
  });
});
