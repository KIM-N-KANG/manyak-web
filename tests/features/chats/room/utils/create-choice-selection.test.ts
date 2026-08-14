import { describe, expect, it } from 'vitest';

import { createChoiceSelection } from '@/features/chats/room/utils/create-choice-selection';

describe('createChoiceSelection', () => {
  it('화면의 첫 번째 위치를 서버 순번 1로 바꾼다', () => {
    expect(createChoiceSelection(17, 0)).toEqual({
      sourceTurnId: 17,
      choiceOrder: 1,
    });
  });

  it('화면의 세 번째 위치를 서버 순번 3으로 바꾼다', () => {
    expect(createChoiceSelection(17, 2)).toEqual({
      sourceTurnId: 17,
      choiceOrder: 3,
    });
  });

  it('원본 턴이 없는 시작 추천 입력에는 메타데이터를 만들지 않는다', () => {
    expect(createChoiceSelection(undefined, 0)).toBeUndefined();
  });
});
