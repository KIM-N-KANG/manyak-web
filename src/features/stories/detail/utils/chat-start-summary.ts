/** 채팅 시작 버튼 요약에 보이는 페르소나 이름의 최대 글자 수다. */
export const CHAT_START_SUMMARY_PERSONA_MAX_LENGTH = 5;

/** 채팅 시작 버튼 요약에 보이는 시작 상황 이름의 최대 글자 수다. */
export const CHAT_START_SUMMARY_SETTING_MAX_LENGTH = 10;

/**
 * 글을 최대 글자 수까지만 남기고 넘치면 말줄임표를 붙인다.
 *
 * @param text 줄일 글
 * @param maxLength 최대 글자 수
 * @returns 줄인 글
 */
const truncate = (text: string, maxLength: number) => {
  const characters = [...text.trim()];

  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join('')}…`
    : characters.join('');
};

/**
 * 채팅 시작 버튼 아래 줄에 보일 요약을 만든다. 페르소나 이름과 시작 상황 이름은 각각 최대 글자 수까지만
 * 보이고 넘치면 말줄임표를 붙인다.
 *
 * @param personaLabel 고른 페르소나 이름. 기본 주인공이면 기본 항목 문구다
 * @param settingName 고른 시작 상황 이름. 시작 상황이 없으면 생략한다
 * @returns "{페르소나} 페르소나 · {시작 상황}" 형태의 요약
 */
export function buildChatStartSummary(
  personaLabel: string,
  settingName?: string,
) {
  const persona = `${truncate(personaLabel, CHAT_START_SUMMARY_PERSONA_MAX_LENGTH)} 페르소나`;
  const setting = truncate(
    settingName ?? '',
    CHAT_START_SUMMARY_SETTING_MAX_LENGTH,
  );

  return setting ? `${persona} · ${setting}` : persona;
}
