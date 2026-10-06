import {
  brushPressure,
  clamp01,
  drawBeret,
  drawBrush,
  drawDots,
  drawMascot,
  drawShadow,
  drawStroke,
  drawWobblyBlob,
  inViewport,
  line,
  mix,
  onBody,
  pencilPressure,
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

import {
  actStart,
  BRUSH_CATCH,
  BRUSH_ON_FLOOR,
  CLOTHESLINE,
  clotheslineY,
  CONSTELLATION_EYE,
  CONSTELLATION_LINES,
  cueMillis,
  cueProgress,
  cueStart,
  FLOOR,
  HANG_SLOTS,
  HOME,
  HUNG_WIDTH,
  loopTime,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  MASCOT_SIZE,
  PAPER,
  PAPER_GRID,
  PAPER_WIDTH,
  parseStroke,
  type RealtimeImageAct,
  type RealtimeImageCue,
  realtimeImageMoment,
  SKETCH_CONTOUR,
  SKETCH_HATCH,
  SKETCH_LASH,
  STARS,
  strokeAt,
  WATERCOLOR_BOB,
  WATERCOLOR_CHEEK,
  WATERCOLOR_FACE,
  WATERCOLOR_HALO,
  WATERCOLOR_SCARF,
} from './realtime-image-choreography';

type Picture = 'SKETCH' | 'WATERCOLOR' | 'CONSTELLATION';

/** 그림이 어디까지 그려졌는지 알려 준다. 다 그린 그림은 모든 cue 가 오래전에 끝난 것으로 본다. */
type Reveal = {
  /** cue 동작이 시작된 뒤 흐른 시간이다. */
  elapsed: (cue: RealtimeImageCue) => number;
  /** 무대가 시작된 뒤 흐른 시간이다. 별이 반짝일 때 쓴다. */
  millis: number;
};

const DONE: Reveal = { elapsed: () => Number.POSITIVE_INFINITY, millis: 0 };
const PI = Math.PI;
/**
 * 무대 소품과 마스코트를 그릴 때 무대 가운데를 붙잡고 줄이는 배율이다. 썸네일 자리는 말풍선 폭을 그대로 쓰되
 * 안의 연기는 작게 보여 대화 흐름에서 튀지 않게 한다. 바탕 점은 줄이지 않는다.
 */
const CONTENT_SCALE = 0.72;
/** 그림이 도화지에서 빨랫줄까지 날아가는 시간이다. */
const FLIGHT_MILLIS = 600;
/** 새 도화지가 이젤에 튀어나오는 시간이다. */
const POP_MILLIS = 320;
const RESET_FADE_START = 600;
const RESET_FADE_MILLIS = 400;
const PAPER_TOP_CENTER = point((PAPER.left + PAPER.right) / 2, PAPER.top);
const PAPER_BOTTOM_CENTER = point(PAPER_TOP_CENTER.x, PAPER.bottom);
const GRID_HEIGHT = (PAPER_GRID * 4) / 3;
const HUNG_SCALE = HUNG_WIDTH / PAPER_WIDTH;

/** 그림이 빨랫줄에 걸리는 한 바퀴 안의 시각이다. 날아가기 시작하는 시각은 FLIGHT_MILLIS 앞이다. */
const HANG_AT: number[] = [
  actStart('RELIEF') + cueStart('EXHALE') + 100 + FLIGHT_MILLIS,
  actStart('DAYDREAM') + FLIGHT_MILLIS,
  actStart('RESET') + FLIGHT_MILLIS,
];
const PICTURES: Picture[] = ['SKETCH', 'WATERCOLOR', 'CONSTELLATION'];

/**
 * 실시간 이미지 대기 무대 한 프레임을 그린다. 바탕 점, 빨랫줄과 걸린 그림, 이젤 도화지, 마스코트, 막에 맞는
 * 소품, 날아가는 그림을 차례로 얹는다. 크기와 자리는 무대 폭(unit)에 대한 비율이라 폭이 바뀌어도 구도가 같다.
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
  const loopMillis = loopTime(millis);
  const unit = width;
  const stage: Stage = { ctx, layer, unit, palette };
  const reveal: Reveal = {
    elapsed: (cue) => actMillis - cueStart(cue),
    millis,
  };

  ctx.clearRect(0, 0, width, height);
  drawDots(ctx, width, height, palette.ink);

  // 투명도를 입히는 소품 캔버스도 같은 배율로 줄여야 합성할 때 자리가 맞는다.
  for (const target of [ctx, layer]) {
    target.save();
    target.translate(width / 2, height / 2);
    target.scale(CONTENT_SCALE, CONTENT_SCALE);
    target.translate(-width / 2, -height / 2);
  }

  drawGallery(stage, loopMillis);
  drawEasel(stage);
  drawEaselPaper(stage, act, actMillis, loopMillis, reveal);

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
  drawActProps(stage, act, actMillis, pose);
  drawFlights(stage, loopMillis);
  ctx.restore();
  layer.restore();
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

// ---- 도화지와 그림 ----

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
 * 도화지 한 장을 격자 좌표로 그린다. 종이 위에 picture 를 reveal 만큼 그린다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param picture 그릴 그림. 없으면 빈 종이다
 * @param reveal 그림이 그려진 정도
 * @param night 검은 면이면 true
 */
function drawSheet(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  picture: Picture | null,
  reveal: Reveal,
  night = picture === 'CONSTELLATION',
) {
  ctx.beginPath();
  ctx.roundRect(0, 0, PAPER_GRID, GRID_HEIGHT, 4);
  ctx.fillStyle = rgba(night ? nightColor(palette) : palette.paper);
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = rgba(palette.ink);
  ctx.stroke();

  if (picture === 'SKETCH') drawSketch(ctx, palette, reveal);

  if (picture === 'WATERCOLOR') drawWatercolor(ctx, palette, reveal);

  if (picture === 'CONSTELLATION') drawConstellation(ctx, palette, reveal);
}

/**
 * 뒤집은 도화지 뒷면 색을 반환한다. 무대에서 튀지 않도록 종이보다 한 톤 짙은 옅은 회색이다.
 *
 * @param palette 테마 색
 * @returns 뒷면 색
 */
const nightColor = (palette: StagePalette) =>
  mix(palette.paper, palette.pencil, 0.14);

/**
 * 이젤 다리와 받침이다. 도화지가 날아가도 이젤은 남는다.
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

/**
 * 이젤에 놓인 도화지다. 막에 따라 빈 종이, 그리는 중인 그림, 뒤집히는 종이를 보이고, 그림이 빨랫줄로 날아간
 * 뒤에는 새 종이가 튀어나온다.
 *
 * @param stage 무대
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @param loopMillis 한 바퀴 안의 시각
 * @param reveal 그림이 그려진 정도
 */
function drawEaselPaper(
  stage: Stage,
  act: RealtimeImageAct,
  actMillis: number,
  loopMillis: number,
  reveal: Reveal,
) {
  const { ctx, unit, palette } = stage;
  const hanging = HANG_AT.findIndex(
    (at) => loopMillis >= at - FLIGHT_MILLIS && loopMillis < at + POP_MILLIS,
  );

  if (hanging >= 0) {
    // 그림이 날아가는 동안 이젤은 비고, 다 날아가면 새 종이가 바닥 쪽을 붙잡고 통 튀어나온다.
    const pop = (loopMillis - HANG_AT[hanging]) / POP_MILLIS;

    if (pop < 0) return;

    const grow = easeOutBack(clamp01(pop));

    withAlpha(stage, clamp01(pop * 2), (target) =>
      onGrid(
        target,
        unit,
        PAPER_BOTTOM_CENTER,
        point(PAPER_GRID / 2, GRID_HEIGHT),
        0.85 + 0.15 * grow,
        0.85 + 0.15 * grow,
        0,
        () => drawSheet(target, palette, null, DONE),
      ),
    );

    return;
  }

  if (act === 'CONSTELLATION') {
    const flip = smooth((cueProgress('FLIP', actMillis) - 0.1) / 0.55);
    const back = flip >= 0.5;

    onGrid(
      ctx,
      unit,
      point(
        PAPER_TOP_CENTER.x,
        PAPER_TOP_CENTER.y - 0.012 * Math.sin(PI * flip),
      ),
      point(PAPER_GRID / 2, 0),
      Math.max(Math.abs(Math.cos(PI * flip)), 0.02),
      1,
      0,
      () =>
        drawSheet(ctx, palette, back ? 'CONSTELLATION' : null, reveal, back),
    );

    return;
  }

  // 안도하는 막에서 크로키가 날아간 뒤로는 새 빈 종이다.
  const picture: Picture | null =
    act === 'SKETCH' ||
    (act === 'RELIEF' && loopMillis < HANG_AT[0] - FLIGHT_MILLIS)
      ? 'SKETCH'
      : act === 'WATERCOLOR'
        ? 'WATERCOLOR'
        : null;

  onGrid(ctx, unit, point(PAPER.left, PAPER.top), point(0, 0), 1, 1, 0, () =>
    drawSheet(ctx, palette, picture, act === 'RELIEF' ? DONE : reveal),
  );
}

/**
 * 빨랫줄과 거기 걸린 그림이다. 걸린 그림은 살짝 흔들리다 멈추고, 한 바퀴 끝에 함께 떨어지며 사라진다.
 *
 * @param stage 무대
 * @param loopMillis 한 바퀴 안의 시각
 */
function drawGallery(stage: Stage, loopMillis: number) {
  const { ctx, unit, palette } = stage;
  const fade = clamp01(
    (loopMillis - actStart('RESET') - RESET_FADE_START) / RESET_FADE_MILLIS,
  );

  ctx.beginPath();
  ctx.moveTo(CLOTHESLINE.left * unit, CLOTHESLINE.y * unit);
  ctx.quadraticCurveTo(
    ((CLOTHESLINE.left + CLOTHESLINE.right) / 2) * unit,
    (CLOTHESLINE.y + 2 * CLOTHESLINE.sag) * unit,
    CLOTHESLINE.right * unit,
    CLOTHESLINE.y * unit,
  );
  ctx.lineWidth = 0.005 * unit;
  ctx.strokeStyle = rgba(palette.ink);
  ctx.stroke();

  HANG_AT.forEach((at, index) => {
    const since = loopMillis - at;

    if (since < 0) return;

    const slot = HANG_SLOTS[index];
    const swing = 9 * Math.exp(-since / 320) * Math.sin(since / 75);
    const top = point(slot.x, clotheslineY(slot.x) - 0.006 + 0.04 * fade ** 2);

    withAlpha(stage, 1 - fade, (target) =>
      drawHung(target, unit, palette, PICTURES[index], top, slot.tilt + swing),
    );
  });
}

/**
 * 빨랫줄에 집게로 걸린 작은 그림이다.
 *
 * @param ctx 캔버스
 * @param unit 무대 폭(픽셀)
 * @param palette 테마 색
 * @param picture 그림
 * @param top 집게 자리(무대 좌표)
 * @param tilt 기울기(도)
 */
function drawHung(
  ctx: CanvasRenderingContext2D,
  unit: number,
  palette: StagePalette,
  picture: Picture,
  top: Point,
  tilt: number,
) {
  onGrid(
    ctx,
    unit,
    top,
    point(PAPER_GRID / 2, 0),
    HUNG_SCALE,
    HUNG_SCALE,
    tilt,
    () => {
      drawSheet(ctx, palette, picture, DONE);
      ctx.fillStyle = rgba(palette.ink);
      ctx.beginPath();
      ctx.roundRect(PAPER_GRID / 2 - 7, -12, 14, 26, 3);
      ctx.fill();
    },
  );
}

/**
 * 다 그린 그림이 이젤에서 빨랫줄로 포물선을 그리며 줄어들어 날아간다.
 *
 * @param stage 무대
 * @param loopMillis 한 바퀴 안의 시각
 */
function drawFlights(stage: Stage, loopMillis: number) {
  const { ctx, unit, palette } = stage;

  HANG_AT.forEach((at, index) => {
    const raw = (loopMillis - (at - FLIGHT_MILLIS)) / FLIGHT_MILLIS;

    if (raw < 0 || raw >= 1) return;

    const f = smooth(raw);
    const slot = HANG_SLOTS[index];
    const to = point(slot.x, clotheslineY(slot.x) - 0.006);
    const from = PAPER_TOP_CENTER;
    const control = point((from.x + to.x) / 2, Math.min(from.y, to.y) - 0.05);
    const u = 1 - f;

    onGrid(
      ctx,
      unit,
      point(
        from.x * u * u + control.x * 2 * f * u + to.x * f * f,
        from.y * u * u + control.y * 2 * f * u + to.y * f * f,
      ),
      point(PAPER_GRID / 2, 0),
      1 + (HUNG_SCALE - 1) * f,
      1 + (HUNG_SCALE - 1) * f,
      slot.tilt * f - 14 * Math.sin(PI * f),
      () => drawSheet(ctx, palette, PICTURES[index], DONE),
    );
  });
}

// ---- 붓질 ----

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

/**
 * cue 진행(0..1)을 reveal 에서 계산한다.
 *
 * @param reveal 그림이 그려진 정도
 * @param cue 소품 신호
 * @returns 0..1 진행
 */
const progressOf = (reveal: Reveal, cue: RealtimeImageCue) =>
  clamp01(reveal.elapsed(cue) / cueMillis(cue));

// ---- 첫 그림: 연필 크로키 ----

const LASH_TICKS = [0.25, 0.5, 0.78];

/**
 * 연필 크로키다. 한 줄 윤곽은 진한 선 옆에 옅은 선을 하나 더 비껴 그어 빠르게 휘갈긴 결을 내고, 머리카락은
 * 옅은 지그재그로 채운다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param reveal 그림이 그려진 정도
 */
function drawSketch(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  reveal: Reveal,
) {
  const contour = progressOf(reveal, 'CONTOUR');
  const ghost = mix(palette.paper, palette.pencil, 0.4);

  drawStroke(
    ctx,
    SKETCH_CONTOUR,
    contour,
    0.8,
    ghost,
    pencilPressure,
    (length) => Math.sin(length * 0.21) * 1.1,
  );
  drawStroke(ctx, SKETCH_CONTOUR, contour, 1.7, palette.pencil, pencilPressure);
  drawStroke(
    ctx,
    SKETCH_HATCH,
    progressOf(reveal, 'HATCH'),
    1.1,
    mix(palette.paper, palette.pencil, 0.6),
    pencilPressure,
  );

  const lash = progressOf(reveal, 'LASH');

  drawStroke(ctx, SKETCH_LASH, lash, 1.2, palette.pencil, pencilPressure);

  if (lash < 1) return;

  // 속눈썹은 눈매를 다 그은 순간 아래로 톡톡 찍힌다.
  const grow = easeOutBack(clamp01(reveal.elapsed('LASH') / 260 - 0.7));

  for (const t of LASH_TICKS) {
    const at = strokeAt(SKETCH_LASH, t);

    if (grow <= 0) break;

    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(at.x - 0.6 * grow, at.y + 2 * grow);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(palette.pencil);
    ctx.stroke();
  }
}

// ---- 둘째 그림: 수채 ----

/** 목도리를 두르면 함께 드러나는 목과 어깨선이다. */
const WATERCOLOR_BODY = [
  'M41,61 L41,67',
  'M52,60 L52,67',
  'M28,73 Q18,80 14,98',
  'M66,73 Q74,80 76,98',
].map(parseStroke);
const SCARF_TAIL = parseStroke('M58,75 C62,84 58,92 63,101');
const SPECKLES: [number, number, number][] = [
  [69, 22, 1.5],
  [74, 29, 1],
  [14, 28, 1.2],
  [20, 70, 0.9],
];

/**
 * 수채 인물이다. 물감을 찍은 자리가 둥글게 번진 위에 굵은 붓으로 단발을 쓸고, 가는 선으로 얼굴을, 볼 터치와
 * 목도리를 얹는다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param reveal 그림이 그려진 정도
 */
function drawWatercolor(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  reveal: Reveal,
) {
  const { brand, paper, pencil: lead } = palette;
  const spread = smooth((reveal.elapsed('HALO') - 60) / 700);

  if (spread > 0) {
    drawWobblyBlob(ctx, WATERCOLOR_HALO, 28 * spread, rgba(brand, 0.07), 0);
    drawWobblyBlob(ctx, point(48, 40), 19 * spread, rgba(brand, 0.05), 2);
    ctx.fillStyle = rgba(mix(paper, lead, 0.3));
    SPECKLES.forEach(([x, y, radius], index) => {
      const pop = easeOutBack(
        clamp01((reveal.elapsed('HALO') - 160 - index * 70) / 240),
      );

      if (pop <= 0) return;

      ctx.beginPath();
      ctx.arc(x, y, radius * pop, 0, PI * 2);
      ctx.fill();
    });
  }

  const scarf = progressOf(reveal, 'SCARF');

  if (scarf > 0) {
    ctx.beginPath();
    ctx.moveTo(27, 71);
    ctx.bezierCurveTo(38, 64, 56, 64, 67, 70);
    ctx.bezierCurveTo(60, 77, 44, 79, 30, 76);
    ctx.closePath();
    ctx.fillStyle = rgba(brand, 0.1 * scarf);
    ctx.fill();
  }

  for (const stroke of WATERCOLOR_BODY)
    drawStroke(ctx, stroke, scarf, 1.1, lead, pencilPressure);

  const face = progressOf(reveal, 'FACE');

  drawStroke(ctx, WATERCOLOR_FACE, face, 1.2, lead, pencilPressure);

  if (face >= 1) {
    const open = easeOutBack(clamp01(reveal.elapsed('FACE') / 200 - 2.1));

    if (open > 0) {
      ctx.strokeStyle = rgba(lead);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      // 첫 그림의 고요히 감은 눈과 달리 웃으며 감은 눈과 입꼬리로 밝은 표정을 준다.
      ctx.beginPath();
      ctx.moveTo(33, 41);
      ctx.quadraticCurveTo(35, 41 - 2.4 * open, 37, 41);
      ctx.moveTo(45, 41.2);
      ctx.quadraticCurveTo(47.5, 41.2 - 2.8 * open, 50, 41.2);
      ctx.moveTo(35, 53);
      ctx.quadraticCurveTo(37.5, 53 + 2.2 * open, 40, 52.6);
      ctx.stroke();
    }
  }

  const blush = easeOutBack(clamp01(reveal.elapsed('CHEEK') / 260));

  if (blush > 0) {
    ctx.fillStyle = rgba(mix(paper, brand, 0.3));
    ctx.beginPath();
    ctx.ellipse(
      WATERCOLOR_CHEEK.x,
      WATERCOLOR_CHEEK.y,
      4 * blush,
      2.6 * blush,
      0,
      0,
      PI * 2,
    );
    ctx.ellipse(52, 49, 3 * blush, 2 * blush, 0, 0, PI * 2);
    ctx.fill();
  }

  drawStroke(
    ctx,
    WATERCOLOR_BOB,
    progressOf(reveal, 'BOB'),
    5.5,
    mix(paper, lead, 0.75),
    brushPressure,
  );
  drawStroke(
    ctx,
    WATERCOLOR_SCARF,
    scarf,
    5,
    mix(paper, brand, 0.3),
    brushPressure,
  );
  drawStroke(
    ctx,
    SCARF_TAIL,
    (scarf - 0.5) * 2,
    4,
    mix(paper, brand, 0.4),
    brushPressure,
  );
}

// ---- 셋째 그림: 별자리 ----

const FAINT_STARS: Point[] = [
  point(10, 10),
  point(76, 12),
  point(9, 72),
  point(40, 104),
  point(77, 96),
  point(70, 84),
];

/**
 * 검은 종이 위 별자리 인물이다. 마스코트가 밟은 자리마다 별이 찍히고, 다 찍으면 별을 이어 옆얼굴과 포니테일이
 * 드러나며 눈 별이 깜빡 떠오른다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param reveal 그림이 그려진 정도
 */
function drawConstellation(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  reveal: Reveal,
) {
  const star = palette.pencil;
  const twinkle = (index: number) =>
    0.7 + 0.3 * Math.sin(reveal.millis / 190 + index * 1.7);

  FAINT_STARS.forEach((at, index) => {
    ctx.fillStyle = rgba(star, 0.35 * twinkle(index));
    ctx.beginPath();
    ctx.arc(at.x, at.y, 0.7, 0, PI * 2);
    ctx.fill();
  });

  const connect = progressOf(reveal, 'CONNECT');
  const total = CONSTELLATION_LINES.reduce(
    (sum, stroke) => sum + stroke.total,
    0,
  );
  let drawn = connect * total;

  ctx.strokeStyle = rgba(palette.pencil, 0.45);
  ctx.lineWidth = 0.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const stroke of CONSTELLATION_LINES) {
    if (drawn <= 0) break;

    // 한 선을 반투명하게 한 번에 그어야 이음매가 진해지지 않는다.
    const portion = Math.min(drawn / stroke.total, 1);

    drawn -= stroke.total;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i += 1) {
      if (stroke.lengths[i] > portion * stroke.total) {
        const at = strokeAt(stroke, portion);

        ctx.lineTo(at.x, at.y);
        break;
      }

      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    ctx.stroke();
  }

  STARS.forEach(({ at, cue, big }, index) => {
    const since = reveal.elapsed(cue) - cueMillis(cue);

    if (since < 0) return;

    drawStar(ctx, at, big ? 2.2 : 1.5, since, twinkle(index), palette, star);
  });

  const eye = reveal.elapsed('CONNECT') - cueMillis('CONNECT') * 0.55;

  if (eye >= 0) drawStar(ctx, CONSTELLATION_EYE, 1.3, eye, 1, palette, star);
}

/**
 * 별 하나다. 찍히는 순간 크게 빛났다가 자리를 잡고, 큰 별은 십자 반짝임을 단다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param at 자리(격자 좌표)
 * @param radius 반지름(격자 단위)
 * @param since 찍힌 뒤 흐른 시간
 * @param twinkle 반짝임 밝기(0..1)
 * @param palette 테마 색
 * @param color 별 색
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  since: number,
  twinkle: number,
  palette: StagePalette,
  color: Rgb,
) {
  const pop = easeOutBack(clamp01(since / 220));
  const flash = Math.max(1 - since / 360, 0);
  const glow = radius * (2.2 + 2.5 * flash) * pop;
  const gradient = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, glow);

  gradient.addColorStop(0, rgba(palette.pencil, 0.25 * twinkle));
  gradient.addColorStop(1, rgba(palette.pencil, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(at.x, at.y, glow, 0, PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(color);
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius * pop, 0, PI * 2);
  ctx.fill();

  if (radius < 2) return;

  const ray = radius * (1.8 + 1.4 * flash) * pop * twinkle;

  ctx.strokeStyle = rgba(color);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(at.x - ray, at.y);
  ctx.lineTo(at.x + ray, at.y);
  ctx.moveTo(at.x, at.y - ray);
  ctx.lineTo(at.x, at.y + ray);
  ctx.stroke();
}

// ---- 베레모와 붓 ----

/**
 * 막에 맞는 붓털 색이다. 처음엔 깨끗하고, 크로키와 별자리는 연필 회색, 수채는 옅은 초록이다.
 *
 * @param palette 테마 색
 * @param act 지금 막
 * @returns 붓털 색
 */
function paintColor(palette: StagePalette, act: RealtimeImageAct): Rgb {
  if (act === 'SKETCH' || act === 'RELIEF') return palette.pencil;

  if (act === 'WATERCOLOR' || act === 'DAYDREAM')
    return mix(palette.paper, palette.brand, 0.4);

  if (act === 'CONSTELLATION' || act === 'RESET') return palette.pencil;

  return mix(palette.paper, palette.pencil, 0.25);
}

/**
 * 화가 베레모와 붓이다. 준비 막에서 베레모는 하늘에서 흔들리며 떨어져 머리에 얹히고, 바닥에 누운 붓은 점프에
 * 맞춰 한 바퀴 돌며 손에 들어온다. 그 뒤로는 몸을 따라 함께 기울고 찌그러진다.
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
  const heldAngle = BRUSH_TILT + pose.rotation;
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
    drawBrush(ctx, palette, paintColor(palette, act)),
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
 * 막에 맞춰 마스코트 둘레에 붙는 소품이다. 힘줄 때의 기합 선과 펌프 반짝임, 휘갈길 때의 속도 선, 안도할 때의
 * 땀방울과 입김, 고민할 때의 생각 점과 번뜩이는 느낌표를 그린다.
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
  if (act === 'HYPE') drawEffort(stage, actMillis, pose);

  if (act === 'SKETCH') drawSpeedLines(stage, actMillis, pose);

  if (act === 'RELIEF') drawRelief(stage, actMillis, pose);

  if (act === 'DAYDREAM') drawDaydream(stage, actMillis);
}

/**
 * 힘을 모으는 동안 머리 둘레에 기합 선이 번갈아 깜빡이고, 펌프 점프마다 몸 둘레로 반짝임이 퍼진다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawEffort(stage: Stage, actMillis: number, pose: MascotPose) {
  const { ctx, unit, palette } = stage;
  const { center } = bodyOf(pose);
  const charge = cueProgress('CHARGE', actMillis);

  if (charge > 0 && charge < 1) {
    const grow = smooth(charge / 0.3) * (1 - smooth((charge - 0.85) / 0.15));

    [-1, 1].forEach((side) => {
      [32, 58, 84].forEach((degrees, index) => {
        const angle = (degrees * PI) / 180;
        const direction = point(side * Math.sin(angle), -Math.cos(angle));
        const pulse = 0.65 + 0.35 * Math.sin(actMillis / 35 + index * 2);
        const inner = 0.072;
        const outer = inner + 0.026 * grow * pulse;

        if (outer - inner < 0.002) return;

        line(
          ctx,
          point(center.x + direction.x * inner, center.y + direction.y * inner),
          point(center.x + direction.x * outer, center.y + direction.y * outer),
          0.008,
          palette.ink,
          unit,
        );
      });
    });
  }

  for (const cue of ['PUMP_1', 'PUMP_2'] as const) {
    const burst = (actMillis - cueStart(cue)) / 320;

    if (burst < 0 || burst >= 1) continue;

    for (let ray = 0; ray < 6; ray += 1) {
      const angle = (ray / 6) * PI * 2 + PI / 6;
      const radius = 0.075 + 0.05 * burst;
      const length = 0.022 * (1 - burst);
      const from = point(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius,
      );

      line(
        ctx,
        from,
        point(
          from.x + Math.cos(angle) * length,
          from.y + Math.sin(angle) * length,
        ),
        0.007 * (1 - burst * 0.6),
        palette.ink,
        unit,
      );
    }
  }
}

/**
 * 연필로 휘갈기는 동안 마스코트 뒤로 짧은 속도 선이 따라붙는다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawSpeedLines(stage: Stage, actMillis: number, pose: MascotPose) {
  const { ctx, unit, palette } = stage;

  for (const [cue, stroke] of [
    ['CONTOUR', SKETCH_CONTOUR],
    ['HATCH', SKETCH_HATCH],
  ] as const) {
    const progress = cueProgress(cue, actMillis);

    if (progress <= 0.04 || progress >= 0.96) continue;

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
 * 빨랫줄의 그림을 올려다보며 고민하는 동안 머리 위로 생각 점이 하나씩 떠오르고, 번뜩이는 순간 점이 사라지며
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
