import { describe, expect, it } from 'vitest';

import {
  buildCharacterSetting,
  buildUserRoleSetting,
  parseCharacterSetting,
  parseUserRoleSetting,
} from '@/features/studio/general/utils/character-settings';

const PROTAGONIST = {
  name: '윤해솔',
  gender: 'FEMALE' as const,
  feature: '## 역할\n막차에서 잘못 내린 회사원\n## 성격\n겁이 많지만 끈질기다.',
};

const SUPPORTING = [
  {
    name: '도하람',
    gender: 'MALE' as const,
    feature: '### 성격\n무뚝뚝한 관리인\n### 말투\n짧은 반말',
  },
  { name: '서은결', gender: null, feature: '' },
];

describe('buildUserRoleSetting', () => {
  it('이름은 넣지 않고 성별 절 뒤에 특징을 잇는다', () => {
    expect(buildUserRoleSetting(PROTAGONIST)).toBe(
      `# 주인공\n## 성별\n여성\n${PROTAGONIST.feature}`,
    );
  });
});

describe('buildCharacterSetting', () => {
  it('인물마다 이름 절을 만들고 빈 성별·특징은 뺀다', () => {
    expect(buildCharacterSetting(SUPPORTING)).toBe(
      `# 등장인물\n\n## 도하람\n### 성별\n남성\n${SUPPORTING[0].feature}\n\n## 서은결`,
    );
  });
});

describe('parseUserRoleSetting', () => {
  it('합친 글을 다시 나누면 원래 성별과 특징이 나온다', () => {
    expect(parseUserRoleSetting(buildUserRoleSetting(PROTAGONIST))).toEqual({
      gender: PROTAGONIST.gender,
      feature: PROTAGONIST.feature,
    });
  });

  it('이전 글의 호칭 절은 특징 맨 앞에 남기고 그 뒤의 성별 절만 칸으로 옮긴다', () => {
    const text =
      '# 주인공\n## 호칭\n정수현\n## 성별\n남성\n## 역할\n승객\n## 배경\n야근\n## 성격\n침착\n## 입력 선호\n';

    expect(parseUserRoleSetting(text)).toEqual({
      gender: 'MALE',
      feature:
        '## 호칭\n정수현\n## 역할\n승객\n## 배경\n야근\n## 성격\n침착\n## 입력 선호',
    });
  });

  it('성별 값이 남성·여성이 아니면 성별 절을 특징에 남긴다', () => {
    expect(
      parseUserRoleSetting('# 주인공\n## 호칭\n수현\n## 성별\n미정\n본문'),
    ).toEqual({
      gender: null,
      feature: '## 호칭\n수현\n## 성별\n미정\n본문',
    });
  });

  it('제목 없는 글과 null을 다룬다', () => {
    expect(parseUserRoleSetting('자유롭게 쓴 주인공 설명')).toEqual({
      gender: null,
      feature: '자유롭게 쓴 주인공 설명',
    });
    expect(parseUserRoleSetting(null)).toEqual({ gender: null, feature: '' });
  });
});

describe('parseCharacterSetting', () => {
  it('합친 글을 다시 나누면 원래 인물들이 나온다', () => {
    expect(parseCharacterSetting(buildCharacterSetting(SUPPORTING))).toEqual(
      SUPPORTING,
    );
  });

  it('### 절은 인물을 나누지 않고 특징으로 둔다', () => {
    const [character] = parseCharacterSetting(
      '# 등장인물\n\n## 오만수\n### 성별\n남성\n### 성격\n침착\n### 말투\n존댓말',
    );

    expect(character).toEqual({
      name: '오만수',
      gender: 'MALE',
      feature: '### 성격\n침착\n### 말투\n존댓말',
    });
  });

  it('인물 제목이 없는 글은 이름 없는 인물 하나로 둔다', () => {
    expect(parseCharacterSetting('인물 소개 글')).toEqual([
      { name: '', gender: null, feature: '인물 소개 글' },
    ]);
    expect(parseCharacterSetting(null)).toEqual([]);
  });

  it('첫 인물 앞의 글은 첫 인물 특징 앞에 붙인다', () => {
    expect(
      parseCharacterSetting('# 등장인물\n관계 메모\n## 하람\n성격 설명')[0]
        .feature,
    ).toBe('관계 메모\n\n성격 설명');
  });
});
