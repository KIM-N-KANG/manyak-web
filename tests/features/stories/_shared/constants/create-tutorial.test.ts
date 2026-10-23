import { describe, expect, it } from 'vitest';

import { getCreateTutorialMessage } from '@/features/stories/_shared/constants/create-tutorial';

describe('getCreateTutorialMessage', () => {
  it('스토리라인 안내는 고른 장르를 쉼표로 잇고 마지막 장르의 받침에 맞춰 "로" 또는 "으로"를 붙인다', () => {
    expect(getCreateTutorialMessage('storyline', ['회귀'])).toMatch(
      /^회귀로 만든 스토리라인/,
    );
    expect(getCreateTutorialMessage('storyline', ['회귀', '집착'])).toMatch(
      /^회귀, 집착으로 만든 스토리라인/,
    );
    // ㄹ 받침과 한글이 아닌 끝 글자는 "로"다.
    expect(getCreateTutorialMessage('storyline', ['액션물'])).toMatch(
      /^액션물로 만든/,
    );
    expect(getCreateTutorialMessage('storyline', ['BL'])).toMatch(/^BL로 만든/);
  });

  it('장르를 모르면 "장르"로 대신한다', () => {
    expect(getCreateTutorialMessage('storyline')).toMatch(/^장르로 만든/);
  });
});
