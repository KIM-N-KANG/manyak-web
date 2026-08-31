export type ChatMessageSegment =
  | { type: 'text'; content: string }
  | { type: 'character-image'; name: string; imageUrl: string };

const CHARACTER_IMAGE_HOSTNAMES = new Set([
  'cdn.manyak.app',
  'dev-cdn.manyak.app',
]);
const CHARACTER_IMAGE_PATH_PREFIXES = [
  '/characters/generated/',
  '/characters/originals/',
] as const;
const CHARACTER_IMAGE_MARKER_LINE = /^\[\[(https:\/\/[^\r\n]+)\]\]$/;
const LEADING_HORIZONTAL_WHITESPACE = /^[ \t]*/;
const SPEAKER_LABEL = /^(.+?)[ \t]*:(?=[ \t]|$)/;

type CharacterImageMarkerMatch = {
  start: number;
  end: number;
  name: string;
  imageUrl: string;
};

/**
 * 채팅 인물 이미지로 허용된 CDN URL인지 확인한다.
 *
 * @param imageUrl 확인할 이미지 URL
 * @returns 운영·개발 생성·오리지널 인물 이미지 경로이면 true, 아니면 false
 */
export function isAllowedChatCharacterImageUrl(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);

    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      CHARACTER_IMAGE_HOSTNAMES.has(url.hostname) &&
      CHARACTER_IMAGE_PATH_PREFIXES.some(
        (pathPrefix) =>
          url.pathname.startsWith(pathPrefix) &&
          url.pathname.length > pathPrefix.length,
      )
    );
  } catch {
    return false;
  }
}

/**
 * 저장 마커 뒤의 대사 줄에서 인물 이름을 추출한다.
 *
 * @param content 저장된 AI 본문
 * @param speakerLineStart 대사 줄이 시작하는 문자열 인덱스
 * @returns `인물명:` 라벨의 이름. 라벨이 없으면 null
 */
function extractSpeakerName(
  content: string,
  speakerLineStart: number,
): string | null {
  const speakerLineEnd = content.indexOf('\n', speakerLineStart);
  const speakerLine = content.slice(
    speakerLineStart,
    speakerLineEnd === -1 ? content.length : speakerLineEnd,
  );
  const label = speakerLine.replace(LEADING_HORIZONTAL_WHITESPACE, '');
  const name = SPEAKER_LABEL.exec(label)?.[1].trim();

  return name || null;
}

/**
 * 저장 본문에서 웹이 신뢰할 수 있는 인물 이미지 마커 위치를 찾는다.
 * 마커 전용 줄·허용 CDN·바로 뒤의 인물 대사를 모두 만족해야 한다.
 *
 * @param content 저장된 AI 본문
 * @returns 이미지로 치환할 수 있는 마커 위치와 인물 정보 목록
 */
function findCharacterImageMarkerMatches(
  content: string,
): CharacterImageMarkerMatch[] {
  const matches: CharacterImageMarkerMatch[] = [];
  let lineStart = 0;

  while (lineStart <= content.length) {
    const lineEnd = content.indexOf('\n', lineStart);
    const markerLineEnd = lineEnd === -1 ? content.length : lineEnd;
    const line = content.slice(lineStart, markerLineEnd);
    const marker = CHARACTER_IMAGE_MARKER_LINE.exec(line);

    if (marker) {
      const imageUrl = marker[1];
      const speakerLineStart = markerLineEnd + 2;
      const name = extractSpeakerName(content, speakerLineStart);

      if (
        name &&
        imageUrl &&
        content.startsWith('\n\n', markerLineEnd) &&
        isAllowedChatCharacterImageUrl(imageUrl)
      ) {
        matches.push({
          start: lineStart,
          end: speakerLineStart,
          name,
          imageUrl,
        });
      }
    }

    if (lineEnd === -1) {
      break;
    }

    lineStart = lineEnd + 1;
  }

  return matches;
}

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
  if (!image.name.trim() || !isAllowedChatCharacterImageUrl(image.imageUrl)) {
    return [...segments];
  }

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
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const markerMatches = findCharacterImageMarkerMatches(normalizedContent);

  if (markerMatches.length === 0) {
    return content ? [{ type: 'text', content }] : [];
  }

  const segments: ChatMessageSegment[] = [];
  let cursor = 0;

  for (const match of markerMatches) {
    const textBeforeMarker = normalizedContent.slice(cursor, match.start);
    const textContent = textBeforeMarker.endsWith('\n')
      ? textBeforeMarker.slice(0, -1)
      : textBeforeMarker;

    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }

    segments.push({
      type: 'character-image',
      name: match.name,
      imageUrl: match.imageUrl,
    });
    cursor = match.end;
  }

  const remainingText = normalizedContent.slice(cursor);

  if (remainingText) {
    segments.push({ type: 'text', content: remainingText });
  }

  return segments;
}
