export type PersonaGender = 'MALE' | 'FEMALE';

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
