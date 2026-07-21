import { describe, expect, it } from 'vitest';

import type { ChatTurnResponse } from '@/api/generated/models';
import { shouldGenerateChoices } from '@/features/chats/room/utils/should-generate-choices';

const turn = (overrides: Partial<ChatTurnResponse> = {}): ChatTurnResponse => ({
  id: 1,
  userInput: '던전에 진입한다',
  aiOutput: '문이 열린다.',
  choices: [],
  ...overrides,
});

describe('shouldGenerateChoices', () => {
  it('토글 on이고 마지막 턴에 선택지가 없으면 true다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: false,
        lastTurn: turn(),
      }),
    ).toBe(true);
  });

  it('토글 off면 false다', () => {
    expect(
      shouldGenerateChoices({
        enabled: false,
        isStreaming: false,
        lastTurn: turn(),
      }),
    ).toBe(false);
  });

  it('스트리밍 중이면 false다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: true,
        lastTurn: turn(),
      }),
    ).toBe(false);
  });

  it('마지막 턴이 없으면(턴 0개) false다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: false,
        lastTurn: undefined,
      }),
    ).toBe(false);
  });

  it('마지막 턴에 id가 없으면 false다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: false,
        lastTurn: turn({ id: undefined }),
      }),
    ).toBe(false);
  });

  it('마지막 턴에 이미 선택지가 있으면 false다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: false,
        lastTurn: turn({ choices: ['안으로 들어간다'] }),
      }),
    ).toBe(false);
  });

  it('choices가 undefined면 선택지 없음으로 보고 true다', () => {
    expect(
      shouldGenerateChoices({
        enabled: true,
        isStreaming: false,
        lastTurn: turn({ choices: undefined }),
      }),
    ).toBe(true);
  });
});
