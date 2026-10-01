/**
 * 주인공(나)·주변 인물 입력과 서버 글(`userRoleSetting`·`characterSetting`) 사이를 오가는 변환이다.
 * 제목 형식은 간편 제작 AI가 조립하는 글(manyak-ai `story_compile_render.py`)과 같다. 이름·성별만
 * 칸으로 받고 나머지 절(역할·배경·성격, 성격·말투·동기 등)은 특징 칸의 본문으로 둔다.
 */

export type CharacterGender = 'MALE' | 'FEMALE';

export type GeneralStoryCharacter = {
  name: string;
  gender: CharacterGender | null;
  feature: string;
};

const GENDER_TEXT: Record<CharacterGender, string> = {
  MALE: '남성',
  FEMALE: '여성',
};

const toGender = (text: string | undefined): CharacterGender | null =>
  (Object.keys(GENDER_TEXT) as CharacterGender[]).find(
    (gender) => GENDER_TEXT[gender] === text?.trim(),
  ) ?? null;

const PROTAGONIST_HEADING = '# 주인공';
const SUPPORTING_HEADING = '# 등장인물';

const joinLines = (parts: (string | false | null)[]) =>
  parts.filter(Boolean).join('\n');

/** 주인공 입력을 `userRoleSetting` 글로 합친다. */
export function buildUserRoleSetting({
  name,
  gender,
  feature,
}: GeneralStoryCharacter) {
  return joinLines([
    PROTAGONIST_HEADING,
    name.trim() && `## 호칭\n${name.trim()}`,
    gender && `## 성별\n${GENDER_TEXT[gender]}`,
    feature.trim(),
  ]);
}

/** 주변 인물 입력을 `characterSetting` 글로 합친다. 인물마다 `## 이름` 절을 만든다. */
export function buildCharacterSetting(characters: GeneralStoryCharacter[]) {
  const blocks = characters.map(({ name, gender, feature }) =>
    joinLines([
      `## ${name.trim()}`,
      gender && `### 성별\n${GENDER_TEXT[gender]}`,
      feature.trim(),
    ]),
  );

  return `${SUPPORTING_HEADING}\n\n${blocks.join('\n\n')}`;
}

/** 첫 줄이 제목이면 떼어 낸 나머지 줄을 반환한다. */
const dropLeadingHeading = (lines: string[], heading: string) => {
  const first = lines.findIndex((line) => line.trim());

  return first >= 0 && lines[first].trim() === heading
    ? lines.slice(first + 1)
    : lines;
};

/** 맨 앞의 `{제목}\n{값}` 두 줄을 읽어 값과 남은 줄을 반환한다. 없으면 그대로 둔다. */
const takeLeadingSection = (lines: string[], heading: string) => {
  const first = lines.findIndex((line) => line.trim());

  if (first < 0 || lines[first].trim() !== heading) {
    return { value: undefined, rest: lines };
  }

  return { value: lines[first + 1], rest: lines.slice(first + 2) };
};

/** 성별 절을 읽는다. 값이 남성·여성이 아니면 절을 본문에 그대로 남긴다. */
const takeGender = (lines: string[], heading: string) => {
  const { value, rest } = takeLeadingSection(lines, heading);
  const gender = toGender(value);

  return gender ? { gender, rest } : { gender: null, rest: lines };
};

/**
 * `userRoleSetting` 글을 주인공 입력으로 나눈다. 맨 앞의 호칭·성별 절만 칸으로 옮기고
 * 나머지는 특징 본문으로 둔다. 어떤 글이 와도 예외 없이 내용을 보존한다.
 */
export function parseUserRoleSetting(
  text: string | null | undefined,
): GeneralStoryCharacter {
  const lines = dropLeadingHeading(
    (text ?? '').split('\n'),
    PROTAGONIST_HEADING,
  );
  const name = takeLeadingSection(lines, '## 호칭');
  const { gender, rest } = takeGender(name.rest, '## 성별');

  return {
    name: name.value?.trim() ?? '',
    gender,
    feature: rest.join('\n').trim(),
  };
}

/**
 * `characterSetting` 글을 주변 인물 입력으로 나눈다. `## 이름` 줄마다 인물을 나누고, 첫 인물 앞의
 * 글은 첫 인물 특징 앞에 붙인다. 인물 제목이 없는 글은 이름 없는 인물 하나에 통째로 둔다.
 */
export function parseCharacterSetting(
  text: string | null | undefined,
): GeneralStoryCharacter[] {
  const lines = dropLeadingHeading(
    (text ?? '').split('\n'),
    SUPPORTING_HEADING,
  );
  const blocks: { name: string; lines: string[] }[] = [];
  const preamble: string[] = [];

  for (const line of lines) {
    const match = /^## (?!#)(.*)$/.exec(line.trim());

    if (match) {
      blocks.push({ name: match[1].trim(), lines: [] });
    } else {
      (blocks.at(-1)?.lines ?? preamble).push(line);
    }
  }

  if (blocks.length === 0) {
    const feature = preamble.join('\n').trim();

    return feature ? [{ name: '', gender: null, feature }] : [];
  }

  return blocks.map((block, index) => {
    const { gender, rest } = takeGender(block.lines, '### 성별');
    const body = index === 0 ? [...preamble, '', ...rest] : rest;

    return { name: block.name, gender, feature: body.join('\n').trim() };
  });
}
