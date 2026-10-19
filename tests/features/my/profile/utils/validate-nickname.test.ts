import { describe, expect, it } from 'vitest';

import { NICKNAME_ERROR_COPY } from '@/features/my/profile/constants';
import { validateNickname } from '@/features/my/profile/utils/validate-nickname';

describe('validateNickname', () => {
  it.each(['달빛작가', 'StoryTeller', '작가4817', 'ab'])(
    '%s는 통과한다',
    (nickname) => {
      expect(validateNickname(nickname)).toBeUndefined();
    },
  );

  it.each(['', '달'])('%s는 2자 미만이라 거부한다', (nickname) => {
    expect(validateNickname(nickname)).toBe(NICKNAME_ERROR_COPY.tooShort);
  });

  it.each(['홍 길동', ' 달빛', 'ㅋㅋ작가', '작가!', '작가😀'])(
    '%s는 허용 문자 밖이라 거부한다',
    (nickname) => {
      expect(validateNickname(nickname)).toBe(
        NICKNAME_ERROR_COPY.invalidCharacter,
      );
    },
  );
});
