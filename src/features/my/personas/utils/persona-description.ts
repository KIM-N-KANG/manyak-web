/**
 * @file 페르소나 성별과 특징을 서버 `description` 한 글로 직렬화하고 다시 나누는 유틸.
 * 서버에는 성별 필드가 없어 아래 형식의 글로 저장한다.
 *
 * @example
 * ```text
 * # 주인공
 * ## 성별
 * 여성
 * 특징 본문(여러 줄 가능)
 * ```
 */

/** 폼에서 쓰는 성별 코드. 서버 필드가 아니라 `description` 글의 성별 줄로 직렬화된다. */
export type PersonaGender = 'MALE' | 'FEMALE';

/**
 * 성별 코드별 표시 문구이자 `description`에 저장되는 성별 줄의 값.
 *
 * @remarks
 * `buildPersonaDescription`이 이 값을 `## 성별` 다음 줄에 그대로 쓰고, `parsePersonaDescription`이
 * 같은 값과 비교해 성별을 되읽는다. 값을 바꾸면 이미 저장된 페르소나의 성별을 읽지 못하고 머리글까지
 * 특징 본문으로 보이게 되므로, 표시 문구만 바꾸려면 별도 상수를 둔다.
 */
export const PERSONA_GENDER_TEXT: Record<PersonaGender, string> = {
  MALE: '남성',
  FEMALE: '여성',
};

/**
 * 성별과 특징을 서버 페르소나 소개(`description`) 글로 합친다. 페르소나를 고른 채팅에서는 이 글이
 * 스토리의 주인공 설정(`userRoleSetting`)을 통째로 대신하므로 일반 제작 주인공 글과 같은 형식을 쓴다.
 *
 * @param gender 성별
 * @param feature 특징 본문
 * @returns `# 주인공` 아래 성별 절과 특징을 둔 글
 */
export function buildPersonaDescription(
  gender: PersonaGender,
  feature: string,
) {
  return [
    '# 주인공',
    '## 성별',
    PERSONA_GENDER_TEXT[gender],
    feature.trim(),
  ].join('\n');
}

/**
 * 서버 페르소나 소개 글을 성별과 특징으로 나눈다. 맨 앞의 `# 주인공` 줄과 성별 절만 걷어 내고 나머지는
 * 특징으로 둔다. 형식이 다른 글은 성별 없이 통째로 특징에 둬 내용을 잃지 않는다.
 *
 * @param description 서버 페르소나 소개
 * @returns 성별(못 읽으면 null)과 특징 본문
 */
export function parsePersonaDescription(
  description: string | null | undefined,
) {
  const lines = (description ?? '').trim().split('\n');
  const body = lines[0]?.trim() === '# 주인공' ? lines.slice(1) : lines;
  const gender =
    body[0]?.trim() === '## 성별'
      ? ((Object.keys(PERSONA_GENDER_TEXT) as PersonaGender[]).find(
          (key) => PERSONA_GENDER_TEXT[key] === body[1]?.trim(),
        ) ?? null)
      : null;

  return {
    gender,
    feature: (gender ? body.slice(2) : lines).join('\n').trim(),
  };
}
