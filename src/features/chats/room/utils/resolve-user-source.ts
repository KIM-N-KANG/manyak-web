import type { ContinueChatRequestUserSource } from '@/api/generated/models';

import { parseInputBlocks, serializeInputBlocks } from './input-blocks';

type ResolveUserSourceParams = {
  filledChoiceText: string | null;
  submittedText: string;
};

/**
 * 전송 문장의 출처를 판별해 서버에 실어 보낼 `userSource`를 정한다.
 * 서버는 문자열만으로 "추천 선택지와 같은 문장을 사용자가 직접 입력한 경우"를 구분할 수 없어,
 * 실제 입력 방식을 아는 프론트가 명시해야 한다(스펙 §3-8).
 *
 * 채우기를 쓴 적이 없으면 `typed`, 채운 문장을 그대로 보내면 `choice`,
 * 채운 뒤 손대서 달라졌으면 `edited_choice`다. 블럭 모드로 채우면 블럭으로 쪼갰다가
 * 다시 직렬화되므로 그 왕복 결과도 "그대로 보낸 것"으로 함께 인정한다.
 *
 * @param filledChoiceText 채우기로 입력창에 넣어둔 추천 선택지 원문(채운 적 없으면 null)
 * @param submittedText 실제로 전송하는 텍스트
 * @returns 전송 문장의 출처
 */
export function resolveUserSource({
  filledChoiceText,
  submittedText,
}: ResolveUserSourceParams): ContinueChatRequestUserSource {
  if (filledChoiceText === null) {
    return 'typed';
  }

  const submitted = submittedText.trim();
  const filled = filledChoiceText.trim();
  const filledAsBlocks = serializeInputBlocks(
    parseInputBlocks(filledChoiceText),
    '\n\n',
  ).trim();

  return submitted === filled || submitted === filledAsBlocks
    ? 'choice'
    : 'edited_choice';
}
