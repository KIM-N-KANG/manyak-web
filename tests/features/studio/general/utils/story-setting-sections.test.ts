import { describe, expect, it } from 'vitest';

import {
  buildStorySettingTexts,
  LENGTH_RATIO_DEFAULT,
  parseStorySettingTexts,
} from '@/features/studio/general/utils/story-setting-sections';

const VALUES = {
  world:
    '왕립 도서관이 도시의 과거를 기록한다.\n\n지워진 문장은 잔향을 남긴다.',
  progression:
    '단서는 사용자의 선택에 따라 공개한다.\n\n차분한 문체를 유지한다.',
};

describe('buildStorySettingTexts', () => {
  it('간편 제작 AI와 같은 절 제목으로 두 글을 만든다', () => {
    expect(buildStorySettingTexts(VALUES, 6)).toEqual({
      worldSetting: `# 세계관\n${VALUES.world}`,
      ruleSetting: `# 전개 규칙\n${VALUES.progression}\n\n# 분량 배분\n묘사 6 : 대사 4`,
    });
  });

  it('빈 칸은 절 제목째 뺀다', () => {
    const { ruleSetting } = buildStorySettingTexts(
      { ...VALUES, progression: '  ' },
      5,
    );

    expect(ruleSetting).toBe('# 분량 배분\n묘사 5 : 대사 5');
  });
});

describe('parseStorySettingTexts', () => {
  it('합친 글을 다시 나누면 원래 칸과 비율이 나온다', () => {
    const { worldSetting, ruleSetting } = buildStorySettingTexts(VALUES, 7);

    expect(parseStorySettingTexts(worldSetting, ruleSetting)).toEqual({
      values: VALUES,
      descriptionRatio: 7,
    });
  });

  it('간편 제작 글의 전제·갈등·문체 톤 절은 앞 칸 본문으로 남겨 다시 합쳐도 원문과 같다', () => {
    const worldSetting =
      '# 세계관\n기록의 도시\n\n# 전제\n막 부임한 사서\n\n# 갈등\n기록을 되살릴지 선택';
    const ruleSetting =
      '# 전개 규칙\n단서를 천천히 공개\n\n# 문체 톤\n차분한 미스터리\n\n# 분량 배분\n묘사 6 : 대사 4';
    const parsed = parseStorySettingTexts(worldSetting, ruleSetting);

    expect(parsed.values.world).toBe(
      '기록의 도시\n\n# 전제\n막 부임한 사서\n\n# 갈등\n기록을 되살릴지 선택',
    );
    expect(parsed.values.progression).toBe(
      '단서를 천천히 공개\n\n# 문체 톤\n차분한 미스터리',
    );
    expect(
      buildStorySettingTexts(parsed.values, parsed.descriptionRatio),
    ).toEqual({ worldSetting, ruleSetting });
  });

  it('절 제목이 없는 글은 칸에 통째로 둔다', () => {
    expect(
      parseStorySettingTexts('제목 없는 세계관 글', '제목 없는 규칙 글'),
    ).toEqual({
      values: {
        world: '제목 없는 세계관 글',
        progression: '제목 없는 규칙 글',
      },
      descriptionRatio: LENGTH_RATIO_DEFAULT,
    });
  });

  it('순서가 어긋난 제목 줄은 본문으로 남긴다', () => {
    const { values, descriptionRatio } = parseStorySettingTexts(
      null,
      '# 분량 배분\n묘사 3 : 대사 7\n# 전개 규칙\n늦게 나온 전개',
    );

    expect(values.progression).toBe('');
    expect(descriptionRatio).toBe(3);
  });

  it('비어 있거나 null이면 빈 칸과 기본 비율을 돌려준다', () => {
    expect(parseStorySettingTexts(null, undefined)).toEqual({
      values: { world: '', progression: '' },
      descriptionRatio: LENGTH_RATIO_DEFAULT,
    });
  });

  it('합이 10이 아닌 비율은 10 기준으로 맞추고 1~9로 자른다', () => {
    expect(
      parseStorySettingTexts(null, '# 분량 배분\n묘사 3 : 대사 1')
        .descriptionRatio,
    ).toBe(8);
    expect(
      parseStorySettingTexts(null, '# 분량 배분\n묘사 10 : 대사 0')
        .descriptionRatio,
    ).toBe(9);
  });
});
