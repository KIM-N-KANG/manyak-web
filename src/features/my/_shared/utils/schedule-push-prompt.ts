'use client';

import {
  advancePushPromptRecord,
  readPushPromptRecord,
  writePushPromptRecord,
} from './push-prompt-storage';
import { requestPushPrompt } from './push-prompt-store';

/**
 * 회원의 제작 요청 한 번을 프롬프트 기록에 반영하고, 물을 차례면 루트 시트를 대기
 * 상태로 만든다. 제작 퍼널이 완성 요청 직후에 부른다. 게스트는 토큰을 등록할 수 없어
 * 호출부가 회원일 때만 부른다.
 *
 * @param userId 회원 공개 ID
 */
export function schedulePushPromptAfterSubmit(userId: string): void {
  const step = advancePushPromptRecord(readPushPromptRecord(userId));

  if (step.record) {
    writePushPromptRecord(userId, step.record);
  }

  if (step.shouldPrompt) {
    requestPushPrompt(userId);
  }
}
