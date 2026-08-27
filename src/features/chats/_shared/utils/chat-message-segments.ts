export type ChatMessageSegment =
  | { type: 'text'; content: string }
  | { type: 'character-image'; name: string; imageUrl: string };

const CHARACTER_IMAGE_MARKER = /\[\[([^\]\r\n]+?):(https?:\/\/[^\]\r\n]+)\]\]/g;

/**
 * 텍스트 토큰을 마지막 텍스트 조각에 이어 붙인다.
 *
 * @param segments 현재 메시지 조각
 * @param content 새로 받은 텍스트 토큰
 * @returns 토큰을 반영한 새 조각 목록
 */
export function appendChatTextSegment(
  segments: readonly ChatMessageSegment[],
  content: string,
): ChatMessageSegment[] {
  if (!content) {
    return [...segments];
  }

  const lastSegment = segments.at(-1);

  if (lastSegment?.type === 'text') {
    return [
      ...segments.slice(0, -1),
      { ...lastSegment, content: lastSegment.content + content },
    ];
  }

  return [...segments, { type: 'text', content }];
}

/**
 * 인물 이미지 조각을 현재 스트리밍 위치에 추가한다.
 * 이미지 이벤트 직전 토큰의 마지막 줄바꿈은 이미지 블록 경계이므로 제거한다.
 *
 * @param segments 현재 메시지 조각
 * @param image 추가할 인물 이미지
 * @returns 이미지를 반영한 새 조각 목록
 */
export function appendChatCharacterImageSegment(
  segments: readonly ChatMessageSegment[],
  image: { name: string; imageUrl: string },
): ChatMessageSegment[] {
  const nextSegments = [...segments];
  const lastSegment = nextSegments.at(-1);

  if (lastSegment?.type === 'text' && lastSegment.content.endsWith('\n')) {
    const content = lastSegment.content.slice(0, -1);

    if (content) {
      nextSegments[nextSegments.length - 1] = { ...lastSegment, content };
    } else {
      nextSegments.pop();
    }
  }

  nextSegments.push({ type: 'character-image', ...image });

  return nextSegments;
}

/**
 * 저장된 AI 본문의 인물 이미지 마커를 렌더 가능한 조각 목록으로 바꾼다.
 * 마커 전용 줄과 마커 뒤의 빈 줄은 이미지 블록의 간격으로 대체한다.
 *
 * @param content 저장된 AI 본문
 * @returns 본문 순서를 보존한 텍스트·이미지 조각 목록
 */
export function parseChatMessageSegments(
  content: string,
): ChatMessageSegment[] {
  const segments: ChatMessageSegment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(CHARACTER_IMAGE_MARKER)) {
    const matchIndex = match.index;
    const name = match[1];
    const imageUrl = match[2];

    if (matchIndex == null || !name || !imageUrl) {
      continue;
    }

    const textBeforeMarker = content.slice(cursor, matchIndex);
    const textContent = textBeforeMarker.endsWith('\n')
      ? textBeforeMarker.slice(0, -1)
      : textBeforeMarker;

    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }

    segments.push({ type: 'character-image', name, imageUrl });
    cursor = matchIndex + match[0].length;

    if (content.startsWith('\n\n', cursor)) {
      cursor += 2;
    }
  }

  const remainingText = content.slice(cursor);

  if (remainingText) {
    segments.push({ type: 'text', content: remainingText });
  }

  return segments;
}

/**
 * 공유 본문에서 저장 마커만 숨기고 원래 텍스트 줄 순서를 복원한다.
 *
 * @param content 저장된 AI 본문
 * @returns 인물 이미지 마커를 제거한 본문
 */
export function stripChatCharacterImageMarkers(content: string): string {
  return content.replace(
    /\n?\[\[[^\]\r\n]+?:https?:\/\/[^\]\r\n]+\]\](?:\n\n)?/g,
    (matched) => (matched.startsWith('\n') ? '\n' : ''),
  );
}
