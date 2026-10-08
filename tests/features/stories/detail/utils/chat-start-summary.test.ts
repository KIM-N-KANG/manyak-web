import { describe, expect, it } from 'vitest';

import { buildChatStartSummary } from '@/features/stories/detail/utils/chat-start-summary';

describe('buildChatStartSummary', () => {
  it('페르소나와 시작 상황 이름을 잇는다', () => {
    expect(buildChatStartSummary('윤해솔', '계곡 입구')).toBe(
      '윤해솔 페르소나 · 계곡 입구',
    );
  });

  it('시작 상황 이름은 10자까지만 보이고 넘치면 말줄임표를 붙인다', () => {
    expect(buildChatStartSummary('기본', '멈춘 시계의 열차가 선다')).toBe(
      '기본 페르소나 · 멈춘 시계의 열차가…',
    );
    expect(buildChatStartSummary('기본', '0123456789')).toBe(
      '기본 페르소나 · 0123456789',
    );
  });

  it('페르소나 이름은 5자까지만 보이고 넘치면 말줄임표를 붙인다', () => {
    expect(buildChatStartSummary('아주긴페르소나', '계곡 입구')).toBe(
      '아주긴페르… 페르소나 · 계곡 입구',
    );
    expect(buildChatStartSummary('다섯글자요', '계곡 입구')).toBe(
      '다섯글자요 페르소나 · 계곡 입구',
    );
  });

  it('시작 상황이 없으면 페르소나만 보인다', () => {
    expect(buildChatStartSummary('윤해솔')).toBe('윤해솔 페르소나');
  });
});
