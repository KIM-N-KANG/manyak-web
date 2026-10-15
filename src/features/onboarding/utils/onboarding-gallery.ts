/** 카드 하나가 맡는 스크롤 구간 중 가운데에 멈춰 있는 앞뒤 비율. */
const GALLERY_DWELL = 0.2;

/**
 * 갤러리 구간의 스크롤 진행률을 카드 위치(0부터 `count - 1`)로 바꾼다. 카드 사이
 * 구간마다 앞뒤 일부는 카드가 가운데에 멈춰 있고, 나머지 구간에서만 다음 카드로
 * 부드럽게 넘어간다. 그래서 스크롤을 멈춘 자리가 대부분 카드 한 장의 가운데가 된다.
 *
 * @param progress 갤러리 구간 스크롤 진행률(0에서 1, 밖의 값은 끝에 붙인다)
 * @param count 카드 수
 * @returns 지금 가운데에 오는 카드 위치. 소수면 두 카드 사이를 지나는 중이다
 */
export function getGalleryPosition(progress: number, count: number): number {
  const lastIndex = count - 1;

  if (lastIndex <= 0) return 0;

  const travel = Math.min(Math.max(progress, 0), 1) * lastIndex;
  const index = Math.min(Math.floor(travel), lastIndex - 1);
  const segment = Math.min(
    Math.max((travel - index - GALLERY_DWELL) / (1 - GALLERY_DWELL * 2), 0),
    1,
  );
  const eased =
    segment < 0.5 ? 2 * segment * segment : 1 - (-2 * segment + 2) ** 2 / 2;

  return index + eased;
}

/**
 * 기능 소개 갤러리의 카드 전환 방식. `gallery`는 옆으로 흐르고, `deck`은 앞 카드가
 * 왼쪽과 오른쪽으로 번갈아 비스듬히 날아가며 뒤 카드가 올라오고, `stack`은 다음 카드가 아래에서 올라와 쌓인다.
 */
export type GalleryMotion = 'gallery' | 'deck' | 'stack';

/** `deck` 전환에서 지나간 카드가 빠지는 쪽. */
export type DeckExitSide = 'left' | 'right';

/**
 * `deck` 카드가 빠지는 쪽을 구한다. 첫 카드는 섹션이 정한 쪽으로, 다음 카드부터는
 * 반대쪽과 번갈아 빠져 같은 방향으로만 날아가는 단조로움을 피한다.
 *
 * @param index 카드 순번
 * @param firstExit 첫 카드가 빠지는 쪽
 * @returns 카드가 빠지는 쪽
 */
export function getDeckExitSide(
  index: number,
  firstExit: DeckExitSide = 'left',
): DeckExitSide {
  if (index % 2 === 0) return firstExit;

  return firstExit === 'left' ? 'right' : 'left';
}

/** 카드 한 장의 위치에 따른 표시 값. */
export interface SlideMotionStyle {
  transform: string;
  opacity: number;
  captionOpacity: number;
}

/** 가로 갤러리에서 카드 한 장만큼 옆으로 옮기는 거리. 카드 폭과 간격 CSS 변수를 쓴다. */
const GALLERY_STEP = 'var(--slide-width) + var(--slide-gap)';

/**
 * 카드가 가운데에서 떨어진 거리로 전환 방식별 위치, 투명도, 캡션 투명도를 구한다.
 * 겹쳐 쌓이는 `deck`과 `stack`은 지금 카드의 캡션만 보이게 해 아래 카드 캡션이
 * 겹쳐 비치지 않게 한다. `stack`의 다음 카드는 갤러리 칸 바로 아래에서 불투명한 채
 * 기다리다 올라오므로, 갤러리 칸이 넘치는 부분을 잘라야 한다.
 *
 * @param motion 전환 방식
 * @param distance 카드 순번에서 지금 위치를 뺀 값. 음수면 지나간 카드다
 * @param exitSide `deck`에서 지나간 카드가 빠지는 쪽
 * @returns 카드의 `transform`, 투명도, 캡션 투명도
 */
export function getSlideMotionStyle(
  motion: GalleryMotion,
  distance: number,
  exitSide: DeckExitSide = 'left',
): SlideMotionStyle {
  const nearness = Math.min(Math.abs(distance), 1);
  const captionOpacity =
    motion === 'gallery' ? 1 : Math.max(1 - Math.abs(distance) * 1.5, 0);

  if (motion === 'deck') {
    if (distance < 0) {
      const away = Math.min(-distance, 1);
      const sign = exitSide === 'left' ? -1 : 1;

      return {
        transform: `translateX(-50%) translate(${sign * away * 115}%, ${-away * 6}%) rotate(${sign * away * 14}deg)`,
        opacity: 1 - away,
        captionOpacity,
      };
    }

    const depth = Math.min(distance, 2);

    return {
      transform: `translateX(-50%) translateY(${-depth * 4}%) scale(${1 - depth * 0.06})`,
      opacity: distance <= 1 ? 1 : Math.max(1 - (distance - 1) * 0.6, 0),
      captionOpacity,
    };
  }

  if (motion === 'stack') {
    if (distance > 0) {
      const rise = Math.min(distance, 1);

      return {
        transform: `translateX(-50%) translateY(calc(${rise} * (100% + 2rem)))`,
        opacity: 1,
        captionOpacity,
      };
    }

    const depth = Math.min(-distance, 2);

    return {
      transform: `translateX(-50%) translateY(${-depth * 5}%) scale(${1 - depth * 0.06})`,
      opacity: Math.max(1 - depth * 0.45, 0),
      captionOpacity,
    };
  }

  return {
    transform: `translateX(calc(-50% + ${distance} * (${GALLERY_STEP}))) scale(${1 - nearness * 0.06})`,
    opacity: 1 - nearness * 0.6,
    captionOpacity,
  };
}
