import { describe, expect, it } from 'vitest';

import { resolveUserSource } from '@/features/chats/room/utils/resolve-user-source';

describe('resolveUserSource', () => {
  it('채우기를 쓴 적이 없으면 typed로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: null,
        submittedText: '문을 조심스럽게 열어본다',
      }),
    ).toBe('typed');
  });

  it('채운 문장을 그대로 보내면 choice로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: '문을 조심스럽게 열어본다',
        submittedText: '문을 조심스럽게 열어본다',
      }),
    ).toBe('choice');
  });

  it('앞뒤 공백만 다르면 그대로 보낸 것으로 보고 choice로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: '문을 조심스럽게 열어본다',
        submittedText: '  문을 조심스럽게 열어본다\n',
      }),
    ).toBe('choice');
  });

  it('블럭 모드로 채워 왕복된 형태도 choice로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: '*문이 삐걱인다* 누구세요?',
        submittedText: '*문이 삐걱인다*\n\n누구세요?',
      }),
    ).toBe('choice');
  });

  it('채운 뒤 문장을 고쳐 보내면 edited_choice로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: '문을 조심스럽게 열어본다',
        submittedText: '문을 조심스럽게 열어보며 숨을 죽인다',
      }),
    ).toBe('edited_choice');
  });

  it('채운 뒤 전부 지우고 새로 써도 고쳐 쓴 것으로 보고 edited_choice로 판별한다', () => {
    expect(
      resolveUserSource({
        filledChoiceText: '문을 조심스럽게 열어본다',
        submittedText: '창문으로 뛰어내린다',
      }),
    ).toBe('edited_choice');
  });
});
