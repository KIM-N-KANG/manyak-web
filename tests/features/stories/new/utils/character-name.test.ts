import { describe, expect, it } from 'vitest';

import type { CharacterInput } from '@/features/stories/new/types';
import {
  getCharacterNameKey,
  getDuplicateNameCharacterIds,
  hasReservedCharacterNameCharacter,
} from '@/features/stories/new/utils/character-name';

const createCharacter = (id: string, name: string): CharacterInput => ({
  id,
  name,
  gender: null,
  selectedTagIds: [],
  selectedCustomTagIds: [],
  customTags: [],
});

describe('getCharacterNameKey', () => {
  it('앞뒤·내부 공백을 없애고 소문자로 맞춘다', () => {
    expect(getCharacterNameKey('  Ma  Nyak ')).toBe('manyak');
  });

  it('자모 조합이 달라도 같은 글자면 같은 키가 된다', () => {
    // 조합형(NFD)으로 쓴 "마냑"과 완성형(NFC)으로 쓴 "마냑"
    expect(getCharacterNameKey('마냑'.normalize('NFD'))).toBe(
      getCharacterNameKey('마냑'),
    );
  });

  it('공백만 있으면 빈 키를 반환한다', () => {
    expect(getCharacterNameKey('   ')).toBe('');
  });
});

describe('hasReservedCharacterNameCharacter', () => {
  it('닫는 대괄호가 포함된 이름을 저장 마커 충돌로 판정한다', () => {
    expect(hasReservedCharacterNameCharacter('세]린')).toBe(true);
  });

  it('콜론·여는 대괄호·이모지는 허용한다', () => {
    expect(hasReservedCharacterNameCharacter('A:B[✨')).toBe(false);
    expect(hasReservedCharacterNameCharacter('')).toBe(false);
  });
});

describe('getDuplicateNameCharacterIds', () => {
  it('겹치는 이름이 없으면 빈 집합을 반환한다', () => {
    const duplicates = getDuplicateNameCharacterIds([
      createCharacter('protagonist', '마냑'),
      createCharacter('supporting-1', '도라지'),
    ]);

    expect(duplicates.size).toBe(0);
  });

  it('먼저 쓴 이름은 남기고 뒤에 같은 이름을 쓴 인물만 걸러낸다', () => {
    const duplicates = getDuplicateNameCharacterIds([
      createCharacter('protagonist', '마냑'),
      createCharacter('supporting-1', '도라지'),
      createCharacter('supporting-2', '마냑'),
    ]);

    expect([...duplicates]).toEqual(['supporting-2']);
  });

  it('표기만 다르고 같은 이름도 중복으로 본다', () => {
    const duplicates = getDuplicateNameCharacterIds([
      createCharacter('protagonist', 'Manyak'),
      createCharacter('supporting-1', ' ma nyak '),
    ]);

    expect([...duplicates]).toEqual(['supporting-1']);
  });

  it('비워 둔 이름은 서로 겹쳐도 중복이 아니다', () => {
    const duplicates = getDuplicateNameCharacterIds([
      createCharacter('protagonist', ''),
      createCharacter('supporting-1', '   '),
      createCharacter('supporting-2', ''),
    ]);

    expect(duplicates.size).toBe(0);
  });

  it('같은 이름이 셋이면 뒤의 둘을 모두 걸러낸다', () => {
    const duplicates = getDuplicateNameCharacterIds([
      createCharacter('protagonist', '마냑'),
      createCharacter('supporting-1', '마냑'),
      createCharacter('supporting-2', '마냑'),
    ]);

    expect([...duplicates]).toEqual(['supporting-1', 'supporting-2']);
  });
});
