import { describe, expect, it } from 'vitest';

import { getDraftExitWarning } from '@/features/stories/_shared/utils/draft-exit-warning';

describe('getDraftExitWarning', () => {
  it('임시 저장본이 없으면 입력 여부로 고른다', () => {
    expect(
      getDraftExitWarning({
        hasInput: false,
        hasSavedDraft: false,
        isSaved: false,
      }),
    ).toBe('nothing');
    expect(
      getDraftExitWarning({
        hasInput: true,
        hasSavedDraft: false,
        isSaved: false,
      }),
    ).toBe('unsavedNew');
  });

  it('임시 저장본이 있으면 저장 뒤 바뀐 것이 있는지로 고른다', () => {
    expect(
      getDraftExitWarning({
        hasInput: true,
        hasSavedDraft: true,
        isSaved: true,
      }),
    ).toBe('saved');
    // 저장 뒤 입력을 모두 지워도 저장본과 달라졌으니 경고한다.
    expect(
      getDraftExitWarning({
        hasInput: false,
        hasSavedDraft: true,
        isSaved: false,
      }),
    ).toBe('unsaved');
  });

  it('등록을 요청했으면 임시 저장 상태와 무관하게 요청 뒤 고친 것이 있는지로 고른다', () => {
    expect(
      getDraftExitWarning({
        hasInput: true,
        hasSavedDraft: false,
        isSaved: false,
        hasSubmitted: true,
        isSubmittedUnchanged: true,
      }),
    ).toBe('submitted');
    expect(
      getDraftExitWarning({
        hasInput: true,
        hasSavedDraft: false,
        isSaved: false,
        hasSubmitted: true,
        isSubmittedUnchanged: false,
      }),
    ).toBe('submittedEdited');
  });
});
