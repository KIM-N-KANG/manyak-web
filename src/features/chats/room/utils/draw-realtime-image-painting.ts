import {
  brushPressure,
  clamp01,
  drawStroke,
  mix,
  pencilPressure,
  rgba,
  type StagePalette,
} from '@/lib/mascot/draw-mascot';
import {
  easeOutBack,
  type Point,
  point,
} from '@/lib/mascot/mascot-choreography';

import {
  BEAM_EDGES,
  CHEEK_AT,
  cueMillis,
  EYE,
  FACE,
  GRID_HEIGHT,
  HAIR,
  MOON,
  MOON_SHADOW,
  MULLION_H,
  MULLION_V,
  NIGHT,
  OUTLINE,
  PANE,
  PAPER_GRID,
  type RealtimeImageCue,
  SIGN,
  strokeAt,
  WINDOW,
} from './realtime-image-choreography';

/** 그림 cue 의 획을 긋는 동작이 시작된 뒤 흐른 시간이다. 다 그렸으면 Infinity, 시작 전이면 -Infinity 다. */
export type Painted = (cue: RealtimeImageCue) => number;

const PI = Math.PI;
const LASH_TICKS = [0.25, 0.5, 0.78];
/**
 * 처음부터 끝까지 같은 굵기로 칠하는 결이다. 영역 안으로 잘라 칠하는 밑칠에 쓴다.
 *
 * @returns 굵기 비율
 */
const flat = () => 1;
let pane: Path2D | undefined;

/**
 * 도화지 한 장을 격자 좌표로 그린다. 종이 위에 밤 창가에서 달을 보는 인물을 painted 만큼 쌓아 그린다. 밑칠,
 * 밑그림, 인물, 마무리 순서로 겹쳐, 아래 층의 회색 위에 위 층의 선과 옅은 초록이 얹힌다.
 *
 * @param ctx 도화지 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param painted 그림 cue 마다 흐른 시간
 */
export function drawPainting(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  painted: Painted,
) {
  const { paper, pencil, brand, ink } = palette;
  const progress = (cue: RealtimeImageCue) =>
    clamp01(painted(cue) / cueMillis(cue));

  const sheet = new Path2D();

  sheet.roundRect(0, 0, PAPER_GRID, GRID_HEIGHT, 4);
  ctx.fillStyle = rgba(paper);
  ctx.fill(sheet);
  // 번짐과 빛이 종이 밖으로 새지 않게 종이 안으로 자르고, 테두리는 맨 위에 다시 긋는다.
  ctx.save();
  ctx.clip(sheet);

  drawNight(ctx, palette, progress('NIGHT'));

  const sketch = mix(paper, pencil, 0.55);

  for (const [cue, stroke] of [
    ['WINDOW', WINDOW],
    ['MULLION_V', MULLION_V],
    ['MULLION_H', MULLION_H],
    ['OUTLINE', OUTLINE],
  ] as const)
    drawStroke(ctx, stroke, progress(cue), 1.1, sketch, pencilPressure);

  drawStroke(
    ctx,
    HAIR,
    progress('HAIR'),
    6.5,
    mix(paper, pencil, 0.8),
    brushPressure,
  );
  drawStroke(ctx, FACE, progress('FACE'), 1.4, pencil, pencilPressure);
  drawEye(ctx, palette, painted);
  drawBeam(ctx, palette, progress('BEAM'));

  const blush = easeOutBack(clamp01(painted('CHEEK') / 200));

  if (blush > 0) {
    ctx.fillStyle = rgba(mix(paper, brand, 0.3));
    ctx.beginPath();
    ctx.ellipse(CHEEK_AT.x, CHEEK_AT.y, 2.6 * blush, 1.6 * blush, 0, 0, PI * 2);
    ctx.fill();
  }

  drawStroke(
    ctx,
    SIGN,
    progress('SIGN'),
    1.1,
    mix(paper, pencil, 0.6),
    pencilPressure,
  );
  ctx.restore();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = rgba(ink);
  ctx.stroke(sheet);
}

/**
 * 넘어가는 도화지의 뒷면이다. 무대에서 튀지 않도록 종이보다 한 톤 짙은 옅은 회색이다.
 *
 * @param ctx 도화지 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 */
export function drawPaperBack(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
) {
  ctx.beginPath();
  ctx.roundRect(0, 0, PAPER_GRID, GRID_HEIGHT, 4);
  ctx.fillStyle = rgba(mix(palette.paper, palette.pencil, 0.14));
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = rgba(palette.ink);
  ctx.stroke();
}

/**
 * 창 안을 밤 색 지그재그로 쓸어 칠한다. 달 자리는 칠하지 않고 남기고, 그 위에 살짝 비낀 원만 밤 색으로 덮여
 * 초승달이 드러난다.
 *
 * @param ctx 도화지 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param progress 0..1 칠한 정도
 */
function drawNight(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  progress: number,
) {
  if (progress <= 0) return;

  const color = mix(palette.paper, palette.pencil, 0.32);
  const moon = new Path2D();
  const shadow = new Path2D();

  pane ??= new Path2D(PANE);
  moon.arc(MOON.at.x, MOON.at.y, MOON.radius, 0, PI * 2);
  shadow.arc(MOON_SHADOW.at.x, MOON_SHADOW.at.y, MOON_SHADOW.radius, 0, PI * 2);

  const outsideMoon = new Path2D();

  outsideMoon.rect(0, 0, PAPER_GRID, GRID_HEIGHT);
  outsideMoon.addPath(moon);

  ctx.save();
  ctx.clip(pane);
  ctx.clip(outsideMoon, 'evenodd');
  drawStroke(ctx, NIGHT, progress, 16, color, flat);
  ctx.restore();

  ctx.save();
  ctx.clip(moon);
  ctx.clip(shadow);
  drawStroke(ctx, NIGHT, progress, 16, color, flat);
  ctx.restore();
}

/**
 * 감은 눈을 긋고, 다 그은 순간 속눈썹을 아래로 톡톡 찍는다.
 *
 * @param ctx 도화지 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param painted 그림 cue 마다 흐른 시간
 */
function drawEye(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  painted: Painted,
) {
  const elapsed = painted('EYE');
  const millis = cueMillis('EYE');

  drawStroke(
    ctx,
    EYE,
    clamp01(elapsed / millis),
    1.2,
    palette.pencil,
    pencilPressure,
  );

  const grow = easeOutBack(clamp01((elapsed - millis) / 120));

  if (grow <= 0) return;

  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(palette.pencil);

  for (const t of LASH_TICKS) {
    const at = strokeAt(EYE, t);

    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(at.x - 0.5 * grow, at.y + 1.6 * grow);
    ctx.stroke();
  }
}

/**
 * 창 위쪽에서 인물 쪽으로 쏟아지는 달빛이다. 붓털 끝이 내려가는 높이까지 띠를 한 번에 채워, 겹친 자리만
 * 진해지지 않게 한다.
 *
 * @param ctx 도화지 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param progress 0..1 칠한 정도
 */
function drawBeam(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  progress: number,
) {
  if (progress <= 0) return;

  const [topLeft, topRight] = BEAM_EDGES.top;
  const [bottomLeft, bottomRight] = BEAM_EDGES.bottom;
  const along = (from: Point, to: Point) =>
    point(
      from.x + (to.x - from.x) * progress,
      from.y + (to.y - from.y) * progress,
    );
  const left = along(topLeft, bottomLeft);
  const right = along(topRight, bottomRight);

  ctx.fillStyle = rgba(palette.brand, 0.12);
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();
}
