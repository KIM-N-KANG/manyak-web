/** 주요 사건 탭의 입력 상태와 검사 규칙이다. */

export type GeneralStoryMainEventDraft = {
  id: string;
  name: string;
  description: string;
  keySentence: string;
};

/**
 * 빈 주요 사건 입력을 만든다.
 *
 * @returns 새 id를 가진 빈 주요 사건 입력
 */
export const createMainEventDraft = (): GeneralStoryMainEventDraft => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  keySentence: '',
});

/**
 * 주요 사건에 입력한 내용이 있는지 반환한다. 삭제 전 확인 여부를 정할 때 쓴다.
 *
 * @param mainEvent 검사할 주요 사건 입력
 * @returns 공백이 아닌 글이 한 칸이라도 있으면 참
 */
export const hasMainEventInput = ({
  name,
  description,
  keySentence,
}: GeneralStoryMainEventDraft) =>
  [name, description, keySentence].some((value) => value.trim());
