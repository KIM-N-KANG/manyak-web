import { describe, expect, it } from 'vitest';

import { getChatTourSteps } from '@/features/chats/room/components/tour/tour-steps';

describe('getChatTourSteps', () => {
  it('블럭 모드에서는 상황·대사 추가 버튼을 함께 안내한다', () => {
    const [first] = getChatTourSteps('block');

    expect(first.id).toBe('add-blocks');
    expect(first.title).toBe('상황·대사 추가');
    expect(first.selectors).toEqual([
      '[data-tour="add-situation"]',
      '[data-tour="add-dialogue"]',
    ]);
  });

  it('일반 모드에서는 대사 추가가 없으므로 상황 추가만 안내한다', () => {
    const [first] = getChatTourSteps('plain');

    expect(first.id).toBe('add-emphasis');
    expect(first.title).toBe('상황 추가');
    expect(first.selectors).toEqual(['[data-tour="add-situation"]']);
  });

  it('모드와 무관하게 입력 설정·랜덤 전송 스텝이 이어진다', () => {
    for (const mode of ['block', 'plain'] as const) {
      expect(getChatTourSteps(mode).map((step) => step.id)).toEqual([
        mode === 'block' ? 'add-blocks' : 'add-emphasis',
        'settings',
        'random-send',
      ]);
    }
  });
});
