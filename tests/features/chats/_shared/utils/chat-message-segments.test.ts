import { describe, expect, it } from 'vitest';

import {
  appendChatCharacterImageSegment,
  appendChatTextSegment,
  isAllowedChatCharacterImageUrl,
  parseChatMessageSegments,
} from '@/features/chats/_shared/utils/chat-message-segments';

const SERIN_IMAGE_URL =
  'https://cdn.manyak.app/characters/generated/serin.webp';
const REI_IMAGE_URL = 'https://cdn.manyak.app/characters/generated/rei.webp';
const DEV_IMAGE_URL =
  'https://dev-cdn.manyak.app/characters/generated/serin.webp';
const ORIGINAL_IMAGE_URL =
  'https://cdn.manyak.app/characters/originals/story-id/serin.webp';
const DEV_ORIGINAL_IMAGE_URL =
  'https://dev-cdn.manyak.app/characters/originals/story-id/serin.webp';

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

  it('허용된 CDN의 생성·오리지널 인물 이미지 URL만 받는다', () => {
    expect(isAllowedChatCharacterImageUrl(SERIN_IMAGE_URL)).toBe(true);
    expect(isAllowedChatCharacterImageUrl(DEV_IMAGE_URL)).toBe(true);
    expect(isAllowedChatCharacterImageUrl(ORIGINAL_IMAGE_URL)).toBe(true);
    expect(isAllowedChatCharacterImageUrl(DEV_ORIGINAL_IMAGE_URL)).toBe(true);
    expect(
      isAllowedChatCharacterImageUrl(
        'http://cdn.manyak.app/characters/generated/serin.webp',
      ),
    ).toBe(false);
    expect(
      isAllowedChatCharacterImageUrl(
        'https://example.com/characters/generated/serin.webp',
      ),
    ).toBe(false);
    expect(
      isAllowedChatCharacterImageUrl(
        'https://cdn.manyak.app/thumbnails/serin.webp',
      ),
    ).toBe(false);
    expect(
      isAllowedChatCharacterImageUrl(
        'https://cdn.manyak.app/characters/generated/',
      ),
    ).toBe(false);
    expect(
      isAllowedChatCharacterImageUrl(
        'https://cdn.manyak.app/characters/originals/',
      ),
    ).toBe(false);
    expect(
      isAllowedChatCharacterImageUrl(
        'https://user@cdn.manyak.app/characters/generated/serin.webp',
      ),
    ).toBe(false);
  });

  it('허용되지 않은 이미지 이벤트는 스트리밍 조각에 추가하지 않는다', () => {
    const segments = [{ type: 'text' as const, content: '세린: 안녕\n' }];

    expect(
      appendChatCharacterImageSegment(segments, {
        name: '세린',
        imageUrl: 'https://example.com/serin.webp',
      }),
    ).toEqual(segments);
  });

  it('저장 마커를 본문 순서의 텍스트와 이미지 조각으로 복원한다', () => {
    const content =
      `*문이 열린다.*\n[[${SERIN_IMAGE_URL}]]\n\n세린: 기다렸어?\n` +
      `[[${REI_IMAGE_URL}]]\n\n레이: 들어가자.`;

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

  it('오리지널 스토리 인물 이미지 저장 마커를 복원한다', () => {
    const content = `[[${DEV_ORIGINAL_IMAGE_URL}]]\n\n세린: 기다렸어?`;

    expect(parseChatMessageSegments(content)).toEqual([
      {
        type: 'character-image',
        name: '세린',
        imageUrl: DEV_ORIGINAL_IMAGE_URL,
      },
      { type: 'text', content: '세린: 기다렸어?' },
    ]);
  });

  it('인물 이름은 저장 마커 뒤의 대사 라벨에서 추출한다', () => {
    const content = `[[${SERIN_IMAGE_URL}]]\n\n  세린: 기다렸어?`;

    expect(parseChatMessageSegments(content)).toEqual([
      {
        type: 'character-image',
        name: '세린',
        imageUrl: SERIN_IMAGE_URL,
      },
      { type: 'text', content: '  세린: 기다렸어?' },
    ]);
  });

  it('외부 호스트를 가리키는 마커 모양 문자열은 본문으로 유지한다', () => {
    const content = '[[https://example.com/serin.webp]]\n\n세린: 기다렸어?';

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
  });

  it('마커 뒤에 인물 대사 라벨이 없으면 본문으로 유지한다', () => {
    const content = `[[${SERIN_IMAGE_URL}]]\n\n*문이 열린다.*`;

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
  });

  it('다른 텍스트와 같은 줄에 있는 마커 모양 문자열은 본문으로 유지한다', () => {
    const content = `설명 [[${SERIN_IMAGE_URL}]]\n\n` + '세린: 기다렸어?';

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
  });

  it('인물 이미지 마커가 없으면 본문을 그대로 유지한다', () => {
    const content = '[[image:forest]]\n*숲이 흔들린다.*';

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
  });

  it('이전 인물명 포함 저장 마커는 일반 본문으로 유지한다', () => {
    const content = `[[세린:${SERIN_IMAGE_URL}]]\n\n세린: 기다렸어?`;

    expect(parseChatMessageSegments(content)).toEqual([
      { type: 'text', content },
    ]);
  });
});
