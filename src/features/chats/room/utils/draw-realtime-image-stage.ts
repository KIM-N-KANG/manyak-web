import {
  clamp01,
  drawBeret,
  drawBrush,
  drawDots,
  drawMascot,
  drawShadow,
  inViewport,
  line,
  mix,
  onBody,
  type Rgb,
  rgba,
  type Stage,
  type StagePalette,
  withAlpha,
} from '@/lib/mascot/draw-mascot';
import {
  blinkOpenness,
  BRUSH_GRIP,
  BRUSH_TILT,
  easeOutBack,
  HAT_ANCHOR,
  HAT_TILT,
  type MascotPose,
  type Point,
  point,
} from '@/lib/mascot/mascot-choreography';

import { drawPainting, drawPaperBack } from './draw-realtime-image-painting';
import {
  BOWL,
  BRUSH_CATCH,
  BRUSH_ON_FLOOR,
  cueMillis,
  cueProgress,
  cueStart,
  FLOOR,
  HOME,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  MASCOT_SIZE,
  NIGHT,
  type PaintColor,
  paintColorAt,
  paintedFor,
  PAPER,
  PAPER_GRID,
  PAPER_WIDTH,
  type RealtimeImageAct,
  type RealtimeImageCue,
  realtimeImageMoment,
  type Stroke,
  strokeAt,
} from './realtime-image-choreography';

const PI = Math.PI;
/**
 * 무대 소품과 마스코트를 그릴 때 무대 가운데를 붙잡고 줄이는 배율이다. 썸네일 자리는 말풍선 폭을 그대로 쓰되
 * 안의 연기는 작게 보여 대화 흐름에서 튀지 않게 한다. 바탕 점은 줄이지 않는다.
 */
const CONTENT_SCALE = 0.72;
const PAPER_TOP_LEFT = point(PAPER.left, PAPER.top);
const PAPER_TOP_CENTER = point((PAPER.left + PAPER.right) / 2, PAPER.top);
const BLANK = () => Number.NEGATIVE_INFINITY;
const DONE = () => Number.POSITIVE_INFINITY;

/**
 * 실시간 이미지 대기 무대 한 프레임을 그린다. 바탕 점, 이젤과 도화지, 물그릇, 마스코트, 베레모와 붓, 막에 맞는
 * 소품을 차례로 얹는다. 크기와 자리는 무대 폭(unit)에 대한 비율이라 폭이 바뀌어도 구도가 같다.
 *
 * @param ctx 무대 캔버스
 * @param layer 소품 묶음을 한 장으로 그린 뒤 투명도를 입힐 때 쓰는 같은 크기의 캔버스
 * @param width 무대 폭(픽셀)
 * @param height 무대 높이(픽셀)
 * @param millis 안무 시작부터 흐른 시간
 * @param palette 테마 색
 * @param lookAt 포인터가 무대 위에 있으면 그 자리(폭 단위 좌표). 마스코트가 그쪽을 본다
 */
export function drawRealtimeImageStage(
  ctx: CanvasRenderingContext2D,
  layer: CanvasRenderingContext2D,
  width: number,
  height: number,
  millis: number,
  palette: StagePalette,
  lookAt: Point | null,
) {
  const { act, actMillis, pose } = realtimeImageMoment(millis);
  const unit = width;
  const stage: Stage = { ctx, layer, unit, palette };

  ctx.clearRect(0, 0, width, height);
  drawDots(ctx, width, height, palette.ink);

  // 투명도를 입히는 소품 캔버스도 같은 배율로 줄여야 합성할 때 자리가 맞는다.
  for (const target of [ctx, layer]) {
    target.save();
    target.translate(width / 2, height / 2);
    target.scale(CONTENT_SCALE, CONTENT_SCALE);
    target.translate(-width / 2, -height / 2);
  }

  drawEasel(stage);
  drawEaselPaper(stage, act, actMillis);
  drawWater(stage);

  // 도화지 위에 올라서 있을 때는 바닥 그림자가 허공에 뜬 것처럼 보여 도화지 가까이에서 옅게 지운다.
  ctx.save();
  ctx.globalAlpha = clamp01(
    (PAPER.left - 0.01 - (pose.x + MASCOT_HALF_WIDTH)) / 0.05,
  );
  drawShadow(ctx, pose, unit, MASCOT_SIZE, FLOOR, palette.ink);
  ctx.restore();

  drawMascot(
    ctx,
    pose,
    unit,
    MASCOT_SIZE,
    palette.brand,
    blinkOpenness(millis),
    lookAt && toContent(lookAt, height / width),
  );
  drawGear(stage, act, actMillis, pose);
  drawBowl(stage);
  drawActProps(stage, act, actMillis, pose);
  ctx.restore();
  layer.restore();
}

/**
 * 0..1 을 부드럽게 시작하고 멈추는 곡선으로 바꾼다.
 *
 * @param t 진행
 * @returns 0..1 곡선 값
 */
function smooth(t: number): number {
  const c = clamp01(t);

  return c * c * (3 - 2 * c);
}

// ---- 도화지 ----

/**
 * 이젤에 놓인 도화지다. 지난 막까지 그린 층 위에 지금 막의 획을 그린 만큼 얹는다. 종이를 넘기는 막에서는 밑의
 * 새 종이 위로 다 그린 종이가 위쪽 가장자리를 축으로 넘어가며 뒷면을 보이고 옅어진다.
 *
 * @param stage 무대
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 */
function drawEaselPaper(
  stage: Stage,
  act: RealtimeImageAct,
  actMillis: number,
) {
  const { ctx, unit, palette } = stage;

  if (act !== 'PAGE_TURN') {
    onGrid(ctx, unit, PAPER_TOP_LEFT, point(0, 0), 1, 1, 0, () =>
      drawPainting(ctx, palette, (cue) => paintedFor(cue, act, actMillis)),
    );

    return;
  }

  onGrid(ctx, unit, PAPER_TOP_LEFT, point(0, 0), 1, 1, 0, () =>
    drawPainting(ctx, palette, BLANK),
  );

  const turn = smooth(cueProgress('TURN', actMillis) / 0.9);
  const fold = Math.cos(PI * turn);
  const front = fold >= 0;

  withAlpha(stage, 1 - smooth((turn - 0.55) / 0.4), (target) =>
    onGrid(
      target,
      unit,
      point(
        PAPER_TOP_CENTER.x,
        PAPER_TOP_CENTER.y - 0.015 * Math.sin(PI * turn),
      ),
      point(PAPER_GRID / 2, 0),
      1,
      front ? Math.max(fold, 0.02) : Math.min(fold, -0.02),
      0,
      () =>
        front
          ? drawPainting(target, palette, DONE)
          : drawPaperBack(target, palette),
    ),
  );
}

// ---- 물그릇 ----

/**
 * 물그릇의 물 표면이다. 붓보다 먼저 그려 붓털 끝이 물 위에 비치게 한다.
 *
 * @param stage 무대
 */
function drawWater(stage: Stage) {
  const { ctx, unit, palette } = stage;

  ctx.fillStyle = rgba(mix(palette.paper, palette.pencil, 0.18));
  ctx.beginPath();
  ctx.ellipse(
    BOWL.x * unit,
    (BOWL.rim + 0.002) * unit,
    BOWL.halfWidth * 0.88 * unit,
    0.004 * unit,
    0,
    0,
    PI * 2,
  );
  ctx.fill();
}

/**
 * 발치의 얕은 물그릇 몸통이다. 붓 뒤에 그려 헹구는 붓털 끝이 물에 잠겨 가려지게 한다.
 *
 * @param stage 무대
 */
function drawBowl(stage: Stage) {
  const { ctx, unit, palette } = stage;
  const half = BOWL.halfWidth;

  ctx.beginPath();
  ctx.moveTo((BOWL.x - half) * unit, BOWL.rim * unit);
  ctx.quadraticCurveTo(
    (BOWL.x - half * 0.9) * unit,
    FLOOR * unit,
    (BOWL.x - half * 0.55) * unit,
    FLOOR * unit,
  );
  ctx.lineTo((BOWL.x + half * 0.55) * unit, FLOOR * unit);
  ctx.quadraticCurveTo(
    (BOWL.x + half * 0.9) * unit,
    FLOOR * unit,
    (BOWL.x + half) * unit,
    BOWL.rim * unit,
  );
  ctx.closePath();
  ctx.fillStyle = rgba(mix(palette.paper, palette.ink, 0.35));
  ctx.fill();
  line(
    ctx,
    point(BOWL.x - half, BOWL.rim),
    point(BOWL.x + half, BOWL.rim),
    0.004,
    palette.ink,
    unit,
  );
}

// ---- 화가 소품 ----

/** 붓털 물감 이름을 테마 색으로 바꾼다. 밑그림은 연필 회색, 밑칠과 인물은 회색, 마무리는 옅은 초록이다. */
const PAINT: Record<PaintColor, (palette: StagePalette) => Rgb> = {
  PENCIL: (palette) => mix(palette.paper, palette.pencil, 0.55),
  GRAY: (palette) => mix(palette.paper, palette.pencil, 0.32),
  GREEN: (palette) => mix(palette.paper, palette.brand, 0.45),
};

/**
 * 붓 회전에서 붓털이 휘는 정도를 반환한다. 끌릴 만큼 살짝 기울 때만 휘고, 치켜들거나 돌릴 때는 곧게 둔다.
 *
 * @param brush 몸 기준 붓 회전(도)
 * @returns -1..1 휨
 */
function bendOf(brush: number): number {
  const lean = Math.min(Math.max(brush / 25, -1), 1);

  return -lean * (1 - clamp01((Math.abs(brush) - 30) / 20));
}

/**
 * 화가 베레모와 붓이다. 준비 막에서 베레모는 하늘에서 흔들리며 떨어져 머리에 얹히고, 바닥에 누운 붓은 점프에
 * 맞춰 한 바퀴 돌며 손에 들어온다. 그 뒤로 붓은 몸을 따라 기울고, 자세의 붓 회전만큼 쥔 자리를 축으로 더
 * 돌며, 누르면 붓털이 퍼지고 끌리면 휜다.
 *
 * @param stage 무대
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawGear(
  stage: Stage,
  act: RealtimeImageAct,
  actMillis: number,
  pose: MascotPose,
) {
  const { ctx, unit, palette } = stage;
  const fall = act === 'GEAR_UP' ? cueProgress('HAT', actMillis) : 1;
  const hat = onBody(pose, HAT_ANCHOR, MASCOT_SIZE);

  inViewport(
    ctx,
    unit,
    MASCOT_SIZE,
    point(hat.x, hat.y - 0.62 * (1 - fall * fall)),
    HAT_TILT + pose.rotation + 22 * Math.sin(fall * PI * 2.5) * (1 - fall),
    pose.scaleX,
    () => drawBeret(ctx, palette, true),
  );

  const held = onBody(pose, BRUSH_GRIP, MASCOT_SIZE);
  const heldAngle = BRUSH_TILT + pose.rotation + pose.brush;
  const flight =
    act === 'GEAR_UP'
      ? clamp01(
          (actMillis - cueStart('BRUSH')) / (cueMillis('BRUSH') * BRUSH_CATCH),
        )
      : 1;
  const grip =
    flight >= 1
      ? held
      : point(
          BRUSH_ON_FLOOR.x + (held.x - BRUSH_ON_FLOOR.x) * flight,
          BRUSH_ON_FLOOR.y +
            (held.y - BRUSH_ON_FLOOR.y) * flight -
            0.08 * Math.sin(PI * flight),
        );
  const angle = flight >= 1 ? heldAngle : -450 + (heldAngle + 450) * flight;

  inViewport(ctx, unit, MASCOT_SIZE, grip, angle, 1, () =>
    drawBrush(
      ctx,
      palette,
      PAINT[paintColorAt(act, actMillis)](palette),
      pose.press,
      bendOf(pose.brush),
    ),
  );
}

/**
 * 붓을 헹구는 동안 물그릇에서 물방울이 세 번 튀어 오른다.
 *
 * @param stage 무대
 * @param progress 헹굼 진행(0..1)
 */
function drawSplash(stage: Stage, progress: number) {
  const { ctx, unit, palette } = stage;

  ctx.fillStyle = rgba(mix(palette.paper, palette.pencil, 0.35));

  for (const [index, side] of [-1, 1, 0.4].entries()) {
    const t = clamp01((progress - 0.25 - index * 0.12) / 0.4);

    if (t <= 0 || t >= 1) continue;

    const radius = 0.0035 * (1 - 0.5 * t);

    ctx.beginPath();
    ctx.arc(
      (BOWL.x + side * 0.02 * t) * unit,
      (BOWL.rim - 0.035 * 4 * t * (1 - t)) * unit,
      radius * unit,
      0,
      PI * 2,
    );
    ctx.fill();
  }
}

/**
 * 완성한 그림을 감상하는 동안 도화지 네 모서리에 반짝임이 차례로 튀어나왔다 사라진다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 */
function drawSparkles(stage: Stage, actMillis: number) {
  const { ctx, unit, palette } = stage;
  const corners = [
    point(PAPER.left - 0.012, PAPER.top - 0.012),
    point(PAPER.right + 0.012, PAPER.top + 0.03),
    point(PAPER.right + 0.008, PAPER.bottom - 0.02),
    point(PAPER.left - 0.01, PAPER.bottom - 0.05),
  ];

  corners.forEach((at, index) => {
    const elapsed = actMillis - cueStart('SHOWCASE') - index * 90;
    const size =
      easeOutBack(clamp01(elapsed / 220)) * (1 - smooth((elapsed - 380) / 180));

    if (size <= 0) return;

    const reach = 0.018 * size;

    line(
      ctx,
      point(at.x - reach, at.y),
      point(at.x + reach, at.y),
      0.005,
      palette.pencil,
      unit,
    );
    line(
      ctx,
      point(at.x, at.y - reach),
      point(at.x, at.y + reach),
      0.005,
      palette.pencil,
      unit,
    );
  });
}

/**
 * 썸네일 위 포인터 자리를 줄여 그린 무대의 좌표로 바꾼다.
 *
 * @param at 썸네일 폭 단위 포인터 자리
 * @param aspect 썸네일 높이 / 폭
 * @returns 무대 좌표
 */
function toContent(at: Point, aspect: number): Point {
  return point(
    0.5 + (at.x - 0.5) / CONTENT_SCALE,
    aspect / 2 + (at.y - aspect / 2) / CONTENT_SCALE,
  );
}

/**
 * 도화지 격자 좌표계로 옮겨 그린다. 무대의 anchor 자리에 격자의 anchorGrid 자리가 오도록 놓고, 그 자리를
 * 축으로 돌리고 늘린다.
 *
 * @param ctx 캔버스
 * @param unit 무대 폭(픽셀)
 * @param anchor 무대 좌표
 * @param anchorGrid anchor 에 올 격자 좌표
 * @param scaleX 가로 배율(1 은 이젤 도화지 크기)
 * @param scaleY 세로 배율
 * @param rotation 회전(도)
 * @param draw 격자 좌표로 그리는 함수
 */
function onGrid(
  ctx: CanvasRenderingContext2D,
  unit: number,
  anchor: Point,
  anchorGrid: Point,
  scaleX: number,
  scaleY: number,
  rotation: number,
  draw: () => void,
) {
  const cell = (PAPER_WIDTH / PAPER_GRID) * unit;

  ctx.save();
  ctx.translate(anchor.x * unit, anchor.y * unit);
  ctx.rotate((rotation * PI) / 180);
  ctx.scale(cell * scaleX, cell * scaleY);
  ctx.translate(-anchorGrid.x, -anchorGrid.y);
  draw();
  ctx.restore();
}

/**
 * 이젤 다리와 받침이다. 종이를 넘겨도 이젤은 남는다.
 *
 * @param stage 무대
 */
function drawEasel(stage: Stage) {
  const { ctx, unit, palette } = stage;
  const ledge = PAPER.bottom - 0.004;

  line(
    ctx,
    point(PAPER.left + 0.07, ledge),
    point(PAPER.left + 0.045, FLOOR + 0.004),
    0.007,
    palette.ink,
    unit,
  );
  line(
    ctx,
    point(PAPER.right - 0.07, ledge),
    point(PAPER.right - 0.045, FLOOR + 0.004),
    0.007,
    palette.ink,
    unit,
  );
  line(
    ctx,
    point(PAPER.left + 0.02, ledge),
    point(PAPER.right - 0.02, ledge),
    0.01,
    palette.ink,
    unit,
  );
}

// ---- 마스코트 둘레 소품 ----

/**
 * 마스코트 몸 가운데와 머리 꼭대기 높이를 반환한다. 소품을 몸에 붙여 그릴 때 쓴다.
 *
 * @param pose 마스코트 자세
 * @returns 몸 가운데와 머리 꼭대기 높이
 */
function bodyOf(pose: MascotPose) {
  const height = MASCOT_HEIGHT * pose.scaleY;

  return {
    center: point(pose.x, pose.y - height * 0.55),
    top: pose.y - height,
    halfWidth: MASCOT_HALF_WIDTH * pose.scaleX,
  };
}

/**
 * 막에 맞춰 마스코트 둘레에 붙는 소품이다. 지그재그로 칠할 때의 속도 선, 안도할 때의 땀방울과 입김, 고민할 때의 생각 점과 번뜩이는 느낌표, 헹굴 때의 물방울, 완성 그림 둘레의
 * 반짝임을 그린다.
 *
 * @param stage 무대
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawActProps(
  stage: Stage,
  act: RealtimeImageAct,
  actMillis: number,
  pose: MascotPose,
) {
  if (act === 'WASH') drawSpeedLines(stage, actMillis, pose, 'NIGHT', NIGHT);

  if (act === 'RELIEF') {
    drawRelief(stage, actMillis, pose);
    drawSplash(stage, cueProgress('RINSE_1', actMillis));
  }

  if (act === 'DAYDREAM') {
    drawDaydream(stage, actMillis);
    drawSplash(stage, cueProgress('RINSE_2', actMillis));
  }

  if (act === 'PAGE_TURN') drawSplash(stage, cueProgress('RINSE_3', actMillis));

  if (act === 'SHOWCASE') drawSparkles(stage, actMillis);
}

/**
 * 지그재그로 쓸어 칠하는 동안 마스코트 뒤로 짧은 속도 선이 따라붙는다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 * @param cue 지그재그 획의 소품 신호
 * @param stroke 지그재그 붓길
 */
function drawSpeedLines(
  stage: Stage,
  actMillis: number,
  pose: MascotPose,
  cue: RealtimeImageCue,
  stroke: Stroke,
) {
  const { ctx, unit, palette } = stage;
  const progress = cueProgress(cue, actMillis);

  if (progress <= 0.04 || progress >= 0.96) return;

  const behind = strokeAt(stroke, progress - 0.06);
  const ahead = strokeAt(stroke, progress);
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const length = Math.hypot(dx, dy) || 1;
  const back = point(-dx / length, -dy / length);
  const { center } = bodyOf(pose);

  [-1, 1].forEach((side) => {
    const start = point(
      center.x + back.x * 0.07 - back.y * side * 0.022,
      center.y + back.y * 0.07 + back.x * side * 0.022,
    );

    line(
      ctx,
      start,
      point(start.x + back.x * 0.03, start.y + back.y * 0.03),
      0.006,
      palette.ink,
      unit,
    );
  });
}

/**
 * 휴 하고 안도하는 동안 머리 옆으로 땀방울이 흘러 떨어지고, 반대쪽으로 입김이 물결치며 흩어진다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawRelief(stage: Stage, actMillis: number, pose: MascotPose) {
  const { ctx, unit, palette } = stage;
  const elapsed = actMillis - cueStart('EXHALE');
  const { top, halfWidth } = bodyOf(pose);

  if (elapsed > 40 && elapsed < 760) {
    const appear = easeOutBack(clamp01((elapsed - 40) / 160));
    const slide = 0.02 * smooth((elapsed - 120) / 380);
    const fall = Math.max(elapsed - 520, 0) / 240;
    const size = 0.012 * appear * (1 - 0.5 * fall);
    const x = pose.x + halfWidth + 0.014 + 0.01 * fall;
    const y = top + 0.035 + slide + 0.06 * fall * fall;

    ctx.fillStyle = rgba(mix(palette.paper, palette.pencil, 0.35));
    ctx.beginPath();
    ctx.moveTo(x * unit, (y - size * 2.3) * unit);
    ctx.quadraticCurveTo(
      (x + size * 1.1) * unit,
      (y - size * 0.6) * unit,
      (x + size) * unit,
      y * unit,
    );
    ctx.arc(x * unit, y * unit, size * unit, 0, PI);
    ctx.quadraticCurveTo(
      (x - size * 1.1) * unit,
      (y - size * 0.6) * unit,
      x * unit,
      (y - size * 2.3) * unit,
    );
    ctx.fill();
  }

  const puff = (elapsed - 180) / 700;

  if (puff > 0 && puff < 1) {
    const drift = 0.05 * smooth(puff);
    const x = pose.x - halfWidth - 0.012 - drift;
    const y = pose.y - MASCOT_HEIGHT * 0.42 - 0.012 * puff;
    const width = 0.04 * (1 - 0.4 * puff);

    ctx.save();
    ctx.globalAlpha = Math.sin(PI * puff);
    ctx.beginPath();
    ctx.moveTo(x * unit, y * unit);
    ctx.bezierCurveTo(
      (x - width * 0.25) * unit,
      (y - 0.012) * unit,
      (x - width * 0.5) * unit,
      (y + 0.012) * unit,
      (x - width * 0.75) * unit,
      y * unit,
    );
    ctx.quadraticCurveTo(
      (x - width * 0.9) * unit,
      (y - 0.008) * unit,
      (x - width) * unit,
      (y - 0.002) * unit,
    );
    ctx.lineWidth = 0.006 * unit;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(palette.ink);
    ctx.stroke();
    ctx.fillStyle = rgba(palette.ink);

    for (const [dx, dy, radius] of [
      [1.2, -0.016, 0.004],
      [1.45, -0.03, 0.0028],
    ]) {
      ctx.beginPath();
      ctx.arc(
        (x - width * dx) * unit,
        (y + dy) * unit,
        radius * unit,
        0,
        PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }
}

const THOUGHT_DOTS: [number, number, number, number][] = [
  [0.06, -0.016, 0.006, 0.2],
  [0.082, -0.046, 0.008, 0.45],
  [0.108, -0.086, 0.011, 0.7],
];

/**
 * 도화지를 올려다보며 고민하는 동안 머리 위로 생각 점이 하나씩 떠오르고, 번뜩이는 순간 점이 사라지며
 * 느낌표가 튀어나온다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 */
function drawDaydream(stage: Stage, actMillis: number) {
  const { ctx, unit, palette } = stage;
  const head = point(HOME.x, FLOOR - MASCOT_HEIGHT);
  const idea = actMillis - cueStart('IDEA');
  const vanish = 1 - clamp01(idea / 150);

  THOUGHT_DOTS.forEach(([dx, dy, radius, at]) => {
    const pop = easeOutBack(
      clamp01(
        (actMillis - cueStart('PONDER') - at * cueMillis('PONDER')) / 220,
      ),
    );
    const size = radius * pop * vanish;

    if (size <= 0) return;

    ctx.fillStyle = rgba(palette.ink);
    ctx.beginPath();
    ctx.arc((head.x + dx) * unit, (head.y + dy) * unit, size * unit, 0, PI * 2);
    ctx.fill();
  });

  if (idea < 0) return;

  const pop = easeOutBack(clamp01(idea / 220));
  const fade = 1 - smooth((idea - 400) / 200);
  const size = pop * fade;

  if (size <= 0) return;

  const mark = point(head.x + 0.1, head.y - 0.1);

  line(
    ctx,
    point(mark.x, mark.y - 0.032 * size),
    point(mark.x, mark.y + 0.004 * size),
    0.013 * size,
    palette.pencil,
    unit,
  );
  ctx.fillStyle = rgba(palette.pencil);
  ctx.beginPath();
  ctx.arc(
    mark.x * unit,
    (mark.y + 0.022 * size) * unit,
    0.0075 * size * unit,
    0,
    PI * 2,
  );
  ctx.fill();

  for (const degrees of [-50, 0, 50]) {
    const angle = ((degrees - 90) * PI) / 180;
    const inner = 0.045 * size;
    const outer = inner + 0.016 * size;

    line(
      ctx,
      point(
        mark.x + Math.cos(angle) * inner,
        mark.y - 0.008 + Math.sin(angle) * inner,
      ),
      point(
        mark.x + Math.cos(angle) * outer,
        mark.y - 0.008 + Math.sin(angle) * outer,
      ),
      0.006,
      palette.pencil,
      unit,
    );
  }
}
