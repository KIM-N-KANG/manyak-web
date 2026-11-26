/**
 * @file 채팅 본문의 이미지 마커 프로토콜과 렌더 조각 모델.
 *
 * 저장 본문은 `[[https://...]]` 단독 줄로 이미지를 표시한다. 인물 이미지는 마커 뒤 빈 줄과
 * `인물명:` 대사 줄이 이어져야 하고, 장면 이미지는 대사 없이 뒤의 빈 줄까지 소비한다.
 * URL은 허용 CDN 호스트와 경로 접두사 안에서만 이미지로 인정하고 나머지는 텍스트로 남긴다.
 * 스트리밍 중에는 마커를 파싱하지 않고 토큰과 이미지 이벤트를 조각 목록에 바로 누적한다.
 */

/**
 * 렌더 단위 조각. `text` 는 마커를 뺀 본문, `character-image` 는 대사 라벨에서 얻은 인물명과
 * 이미지, `scene-image` 는 인물명 없는 장면 이미지다.
 */
export type ChatMessageSegment =
  | { type: 'text'; content: string }
  | { type: 'character-image'; name: string; imageUrl: string }
  | { type: 'scene-image'; imageUrl: string };

export type ChatImageSegment = Exclude<ChatMessageSegment, { type: 'text' }>;

const SCENE_IMAGE_PATH_PREFIX = '/scenes/originals/';
/** 이미지로 인정하는 CDN 호스트(운영, 개발). 본문 마커의 임의 URL을 렌더하지 않기 위한 허용 목록이다. */
const CHARACTER_IMAGE_HOSTNAMES = new Set([
  'cdn.manyak.app',
  'dev-cdn.manyak.app',
]);
/** 허용 호스트 안에서 이미지로 인정하는 경로 접두사. 접두사만 있고 뒤 경로가 비면 거부한다. */
const CHARACTER_IMAGE_PATH_PREFIXES = [
  '/characters/generated/',
  '/characters/originals/',
  // 일반 제작·수정에서 올린 인물 이미지(KNK-1503). 백엔드가 `characters/uploaded/` 아래 키로 저장한다.
  '/characters/uploaded/',
  // 실시간 이미지(KNK-1299). 백엔드가 `chat-images/{chatId}/{turn}-{uuid}.webp` 키로 발급한다.
  '/chat-images/',
  // 오리지널 스토리 프롤로그·시작 상황의 장면 이미지(KNK-1545). 인물 대사 없이 마커만으로 표시한다.
  SCENE_IMAGE_PATH_PREFIX,
] as const;
/**
 * 줄 전체가 이미지 마커인지 판정한다. https URL만 받고 앞뒤에 다른 글자가 있으면 마커가 아니다.
 *
 * @example
 * [[https://cdn.manyak.app/characters/generated/a.webp]]
 */
const CHARACTER_IMAGE_MARKER_LINE = /^\[\[(https:\/\/[^\r\n]+)\]\]$/;
const LEADING_HORIZONTAL_WHITESPACE = /^[ \t]*/;
/**
 * 대사 줄 앞의 `이름:` 라벨. 콜론 뒤가 공백이나 줄 끝일 때만 라벨로 본다(`12:30` 같은 시각 제외).
 *
 * @example
 * 하린: 오늘은 어땠어?
 */
const SPEAKER_LABEL = /^(.+?)[ \t]*:(?=[ \t]|$)/;

type CharacterImageMarkerMatch = {
  /** CRLF를 LF로 바꾼 본문에서 마커 줄이 시작하는 인덱스. */
  start: number;
  /** 소비가 끝나는 인덱스(배타). 인물 이미지는 뒤 빈 줄까지, 장면 이미지는 뒤 줄바꿈 최대 2개까지 포함한다. */
  end: number;
  /** 대사 라벨의 인물명. 장면 이미지면 null이다. */
  name: string | null;
  imageUrl: string;
};

/**
 * 채팅 인물 이미지로 허용된 CDN URL인지 확인한다.
 *
 * @param imageUrl 확인할 이미지 URL
 * @returns 운영·개발 생성·오리지널·업로드·실시간 인물 이미지나 장면 이미지 경로이면 true, 아니면 false
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
 * 이미지 조각의 대체 텍스트를 만든다.
 *
 * @param segment 인물 또는 장면 이미지 조각
 * @returns "{인물명} 인물 이미지" 또는 "장면 이미지"
 */
export function getChatImageAlt(segment: ChatImageSegment): string {
  return segment.type === 'scene-image'
    ? '장면 이미지'
    : `${segment.name} 인물 이미지`;
}

/**
 * 허용된 URL 중 장면 이미지 경로인지 확인한다.
 *
 * @param imageUrl 허용 검사를 통과한 이미지 URL
 * @returns 장면 이미지 경로이면 true, 아니면 false
 */
function isSceneImageUrl(imageUrl: string): boolean {
  return new URL(imageUrl).pathname.startsWith(SCENE_IMAGE_PATH_PREFIX);
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
 * 저장 본문에서 웹이 신뢰할 수 있는 이미지 마커 위치를 찾는다.
 * 인물 이미지는 마커 전용 줄·허용 CDN·바로 뒤의 인물 대사를 모두 만족해야 한다.
 * 장면 이미지는 대사 없이 마커 전용 줄·장면 경로만 만족하면 되고, 뒤의 빈 줄을 함께 소비한다.
 *
 * @param content 저장된 본문
 * @returns 이미지로 치환할 수 있는 마커 위치와 인물 정보 목록. 장면 이미지는 name이 null이다
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

    if (marker && isAllowedChatCharacterImageUrl(marker[1])) {
      const imageUrl = marker[1];
      const speakerLineStart = markerLineEnd + 2;

      if (isSceneImageUrl(imageUrl)) {
        const trailingBreak = content.startsWith('\n\n', markerLineEnd)
          ? 2
          : content.startsWith('\n', markerLineEnd)
            ? 1
            : 0;

        matches.push({
          start: lineStart,
          end: markerLineEnd + trailingBreak,
          name: null,
          imageUrl,
        });
      } else if (content.startsWith('\n\n', markerLineEnd)) {
        const name = extractSpeakerName(content, speakerLineStart);

        if (name) {
          matches.push({
            start: lineStart,
            end: speakerLineStart,
            name,
            imageUrl,
          });
        }
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
 * 저장된 AI 본문·프롤로그·시작 상황의 이미지 마커를 렌더 가능한 조각 목록으로 바꾼다.
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
    // 마커 앞 줄바꿈(장면 이미지는 빈 줄까지)은 이미지 블록 간격으로 대체한다.
    const textContent = textBeforeMarker.replace(/\n+$/, '');

    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }

    segments.push(
      match.name === null
        ? { type: 'scene-image', imageUrl: match.imageUrl }
        : {
            type: 'character-image',
            name: match.name,
            imageUrl: match.imageUrl,
          },
    );
    cursor = match.end;
  }

  const remainingText = normalizedContent.slice(cursor);

  if (remainingText) {
    segments.push({ type: 'text', content: remainingText });
  }

  return segments;
}
