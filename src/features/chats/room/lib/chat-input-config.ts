/** 채팅 입력 모드. 블럭(묘사/대사) 모드와 일반 텍스트 모드가 있다. */
export type ChatInputMode = 'block' | 'plain';

/** 주어진 값이 유효한 채팅 입력 모드인지 판별한다. */
export function isChatInputMode(value: string | null): value is ChatInputMode {
  return value === 'block' || value === 'plain';
}
