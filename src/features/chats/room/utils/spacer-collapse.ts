type SpacerCollapseInput = {
  /** 현재 화면에 반영된 스페이서 높이(px) */
  spacerHeight: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/**
 * 앵커 고정용 스페이서의 회수 가능한 높이를 계산한다.
 *
 * 스페이서는 전송 직후 사용자 메시지를 뷰포트 상단에 고정하기 위한
 * 하단 여백인데, 응답이 끝난 뒤에도 남아 빈 공간이 된다. 사용자가 위로
 * 스크롤해 생긴 여유(현재 위치 아래로 남은 스크롤 거리)만큼만 줄이면
 * 화면에 보이는 콘텐츠를 움직이지 않고 여백을 없앨 수 있다.
 *
 * @param input 현재 스페이서 높이와 뷰포트 스크롤 지표
 * @returns 새로 적용할 스페이서 높이(px, 0 이상·현재 높이 이하)
 */
export function computeCollapsedSpacerHeight({
  spacerHeight,
  scrollTop,
  scrollHeight,
  clientHeight,
}: SpacerCollapseInput): number {
  const slack = scrollHeight - clientHeight - scrollTop;

  if (slack <= 0) {
    return spacerHeight;
  }

  return Math.max(0, spacerHeight - slack);
}
