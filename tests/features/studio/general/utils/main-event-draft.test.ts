import { describe, expect, it } from 'vitest';

import {
  createMainEventDraft,
  hasMainEventInput,
} from '@/features/studio/general/utils/main-event-draft';

describe('hasMainEventInput', () => {
  it('공백만 있으면 입력이 없는 것이다', () => {
    expect(hasMainEventInput(createMainEventDraft())).toBe(false);
    expect(
      hasMainEventInput({
        ...createMainEventDraft(),
        name: ' ',
        description: '\n',
      }),
    ).toBe(false);
  });

  it('칸 하나라도 글이 있으면 입력이 있는 것이다', () => {
    expect(
      hasMainEventInput({
        ...createMainEventDraft(),
        keySentence: '장부를 연다',
      }),
    ).toBe(true);
  });
});
