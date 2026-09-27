/**
 * 스토리 설정 탭의 칸과 서버 글(`worldSetting`·`ruleSetting`) 사이를 오가는 변환이다.
 * 절 제목은 간편 제작 AI가 조립하는 형식(manyak-ai `story_compile_render.py`)의 제목을 그대로 쓴다.
 * 일반 제작은 그중 세계관·전개 규칙·분량 배분만 받으므로, 간편 제작 글의 나머지 절(전제·갈등·문체 톤)은
 * 앞 절의 본문으로 남아 수정해도 내용이 사라지지 않는다.
 */

export type StorySettingSectionValues = {
  world: string;
  progression: string;
};

/** 묘사 비율(1~9)이다. 대사 비율은 10에서 뺀 값이다. */
export const LENGTH_RATIO_MIN = 1;
export const LENGTH_RATIO_MAX = 9;
export const LENGTH_RATIO_DEFAULT = 5;

const WORLD_HEADING = '세계관';
const PROGRESSION_HEADING = '전개 규칙';
const LENGTH_RATIO_HEADING = '분량 배분';

/** 묘사 비율을 `묘사 N : 대사 M` 문장으로 바꾼다. */
export const formatLengthRatio = (descriptionRatio: number) =>
  `묘사 ${descriptionRatio} : 대사 ${10 - descriptionRatio}`;

const joinSections = (sections: readonly (readonly [string, string])[]) =>
  sections
    .filter(([, body]) => body.trim())
    .map(([heading, body]) => `# ${heading}\n${body.trim()}`)
    .join('\n\n');

/**
 * 칸 값과 묘사 비율을 등록 요청의 두 글로 합친다. 빈 칸은 절 제목째 뺀다.
 */
export function buildStorySettingTexts(
  values: StorySettingSectionValues,
  descriptionRatio: number,
) {
  return {
    worldSetting: joinSections([[WORLD_HEADING, values.world]]),
    ruleSetting: joinSections([
      [PROGRESSION_HEADING, values.progression],
      [LENGTH_RATIO_HEADING, formatLengthRatio(descriptionRatio)],
    ]),
  };
}

/**
 * 글을 정해진 절 제목으로 나눈다. 제목은 정해진 순서로 나올 때만 칸을 나누고, 순서가 어긋난
 * 제목 줄과 첫 제목 앞의 글은 본문으로 남긴다. 어떤 글이 와도 예외 없이 내용을 어느 칸엔가 보존한다.
 */
function splitSections(text: string, headings: readonly string[]) {
  const bodies = headings.map((): string[] => []);
  let current = 0;
  let nextAllowed = 0;

  for (const line of text.split('\n')) {
    const found = headings.findIndex(
      (heading, index) =>
        index >= nextAllowed && line.trim() === `# ${heading}`,
    );

    if (found >= 0) {
      current = found;
      nextAllowed = found + 1;

      continue;
    }

    bodies[current].push(line);
  }

  return bodies.map((lines) => lines.join('\n').trim());
}

const parseLengthRatio = (text: string) => {
  const match = /묘사\s*(\d+)\s*:\s*대사\s*(\d+)/.exec(text);
  const description = Number(match?.[1]);
  const dialogue = Number(match?.[2]);

  if (!match || description + dialogue <= 0) {
    return LENGTH_RATIO_DEFAULT;
  }

  const ratio = Math.round((description / (description + dialogue)) * 10);

  return Math.min(LENGTH_RATIO_MAX, Math.max(LENGTH_RATIO_MIN, ratio));
};

/**
 * 수정 폼이 받은 두 글을 칸 값과 묘사 비율로 나눈다. 절 제목이 없는 글은 첫 칸(세계관·전개 방식)에 통째로 둔다.
 */
export function parseStorySettingTexts(
  worldSetting: string | null | undefined,
  ruleSetting: string | null | undefined,
) {
  const [world] = splitSections(worldSetting ?? '', [WORLD_HEADING]);
  const [progression, lengthRatio] = splitSections(ruleSetting ?? '', [
    PROGRESSION_HEADING,
    LENGTH_RATIO_HEADING,
  ]);

  return {
    values: { world, progression },
    descriptionRatio: parseLengthRatio(lengthRatio),
  };
}
