import { describe, expect, it } from 'vitest';

import type { CharacterInput } from '@/features/stories/new/types';
import { toCharacterRequest } from '@/features/stories/new/utils/character-request';

const createCharacter = (
  overrides: Partial<CharacterInput> = {},
): CharacterInput => ({
  id: 'character-1',
  name: '',
  gender: null,
  selectedTagIds: [],
  selectedCustomTagIds: [],
  customTags: [],
  ...overrides,
});

describe('toCharacterRequest', () => {
  it('비워 둔 이름과 성별은 null로 보낸다', () => {
    expect(toCharacterRequest(createCharacter())).toEqual({
      name: null,
      gender: null,
      featureTagIds: [],
      customTags: [],
    });
  });

  it('공백만 입력한 이름도 null로 보낸다', () => {
    expect(
      toCharacterRequest(createCharacter({ name: '   ' })).name,
    ).toBeNull();
  });

  it('이름의 앞뒤 공백을 다듬는다', () => {
    expect(toCharacterRequest(createCharacter({ name: ' 마냑 ' })).name).toBe(
      '마냑',
    );
  });

  it('선택 해제한 직접 추가 특징은 싣지 않는다', () => {
    const character = createCharacter({
      selectedTagIds: [3],
      customTags: [
        { id: 'custom-1', name: '회귀물' },
        { id: 'custom-2', name: '해제한 특징' },
      ],
      selectedCustomTagIds: ['custom-1'],
    });

    expect(toCharacterRequest(character)).toEqual({
      name: null,
      gender: null,
      featureTagIds: [3],
      customTags: ['회귀물'],
    });
  });

  it('선택한 성별은 그대로 싣는다', () => {
    expect(
      toCharacterRequest(createCharacter({ gender: 'FEMALE' })).gender,
    ).toBe('FEMALE');
  });
});
