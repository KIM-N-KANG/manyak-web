import { describe, expect, it } from 'vitest';

import { toVisibleHomeSections } from '@/features/stories/list/utils/home-sections';

describe('toVisibleHomeSections', () => {
  it('서버 순서를 유지하고 카드가 없는 섹션은 뺀다', () => {
    const sections = toVisibleHomeSections({
      sections: [
        { id: 'a', name: '신작', items: [{ id: 's1', title: '하나' }] },
        { id: 'b', name: '빈 섹션', items: [] },
        { id: null, name: '인기 스토리', items: [{ id: 's2', title: '둘' }] },
      ],
    });

    expect(sections.map((section) => section.name)).toEqual([
      '신작',
      '인기 스토리',
    ]);
    expect(sections[1].stories[0]).toMatchObject({ id: 's2', genres: [] });
  });

  it('기본 섹션은 id가 없어도 서로 다른 키를 가진다', () => {
    const keys = toVisibleHomeSections({
      sections: [
        { id: null, name: '인기 스토리', items: [{ id: 's1' }] },
        { id: null, name: '오리지널 스토리', items: [{ id: 's2' }] },
      ],
    }).map((section) => section.key);

    expect(new Set(keys).size).toBe(2);
  });

  it('응답이 없으면 빈 목록을 돌려준다', () => {
    expect(toVisibleHomeSections(undefined)).toEqual([]);
  });
});
