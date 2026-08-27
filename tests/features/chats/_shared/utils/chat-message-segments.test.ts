import { describe, expect, it } from 'vitest';

import {
  appendChatCharacterImageSegment,
  appendChatTextSegment,
  parseChatMessageSegments,
  stripChatCharacterImageMarkers,
} from '@/features/chats/_shared/utils/chat-message-segments';

const SERIN_IMAGE_URL =
  'https://cdn.manyak.app/characters/generated/serin.webp';
const REI_IMAGE_URL = 'https://cdn.manyak.app/characters/generated/rei.webp';

describe('채팅 메시지 조각', () => {
  it('텍스트 토큰은 마지막 텍스트 조각에 누적한다', () => {
    const first = appendChatTextSegment([], '안녕');
    const second = appendChatTextSegment(first, '하세요');

    expect(second).toEqual([{ type: 'text', content: '안녕하세요' }]);
    expect(first).toEqual([{ type: 'text', content: '안녕' }]);
  });

  it('이미지 이벤트를 도착 위치에 추가하고 다음 텍스트는 새 조각으로 시작한다', () => {
    const beforeImage = appendChatTextSegment([], '*문이 열린다.*\n');
    const withImage = appendChatCharacterImageSegment(beforeImage, {
      name: '세린',
      imageUrl: SERIN_IMAGE_URL,
    });
    const completed = appendChatTextSegment(withImage, '세린: 기다렸어?');

    expect(completed).toEqual([
      { type: 'text', content: '*문이 열린다.*' },
      {
        type: 'character-image',
        name: '세린',
        imageUrl: SERIN_IMAGE_URL,
      },
      { type: 'text', content: '세린: 기다렸어?' },
    ]);
  });

  it('같은 인물 이미지 이벤트가 반복돼도 각 위치를 유지한다', () => {
    const firstImage = appendChatCharacterImageSegment([], {
      name: '세린',
      imageUrl: SERIN_IMAGE_URL,
    });
    const line = appendChatTextSegment(firstImage, '세린: 하나.\n');
    const secondImage = appendChatCharacterImageSegment(line, {
      name: '세린',
      imageUrl: SERIN_IMAGE_URL,
    });

    expect(
      secondImage.filter((segment) => segment.type === 'character-image'),
    ).toHaveLength(2);
  });

  it('저장 마커를 본문 순서의 텍스트와 이미지 조각으로 복원한다', () => {
    const content =
      `*문이 열린다.*\n[[세린:${SERIN_IMAGE_URL}]]\n\n세린: 기다렸어?\n` +
      `[[레이:${REI_IMAGE_URL}]]\n\n레이: 들어가자.`;

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content: '*문이 열린다.*' },
      {
        type: 'character-image',
        name: '세린',
        imageUrl: SERIN_IMAGE_URL,
      },
      { type: 'text', content: '세린: 기다렸어?' },
      {
        type: 'character-image',
        name: '레이',
        imageUrl: REI_IMAGE_URL,
      },
      { type: 'text', content: '레이: 들어가자.' },
    ]);
  });

  it('공유 본문에서는 저장 마커만 숨기고 텍스트 줄 순서를 보존한다', () => {
    const content =
      `*문이 열린다.*\n[[세린:${SERIN_IMAGE_URL}]]\n\n세린: 기다렸어?\n` +
      `[[레이:${REI_IMAGE_URL}]]\n\n레이: 들어가자.`;

    expect(stripChatCharacterImageMarkers(content)).toBe(
      '*문이 열린다.*\n세린: 기다렸어?\n레이: 들어가자.',
    );
  });

  it('인물 이미지 마커가 없으면 본문을 그대로 유지한다', () => {
    const content = '[[image:forest]]\n*숲이 흔들린다.*';

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
    expect(stripChatCharacterImageMarkers(content)).toBe(content);
  });
});
