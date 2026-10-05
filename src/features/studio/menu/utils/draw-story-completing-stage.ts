import {
  blinkOpenness,
  BLOOM_CENTER,
  CHIP_HEIGHT,
  completingMoment,
  type Cubic,
  cubicAt,
  cueMillis,
  cueProgress,
  cueStart,
  easeOutBack,
  FLOOR,
  KEY_COLUMNS,
  KEY_COUNT,
  keyFor,
  keystrokeAt,
  KEYSTROKES,
  KEYWORD_CHIPS,
  MASCOT_BOTTOM,
  MASCOT_CENTER,
  MASCOT_SIZE,
  MASCOT_VIEWPORT,
  type MascotPose,
  PICKED_CHIPS,
  PICKED_STORYLINE,
  type Point,
  propVisibility,
  SIGNATURE,
  STORYLINE_BOTTOM,
  STORYLINE_LEFTS,
  STORYLINE_TOP,
  STORYLINE_WIDTH,
  STROKE_1,
  STROKE_2,
} from './story-completing-choreography';

/** sRGB 0..255 세 값이다. 색을 섞어야 해서 CSS 문자열 대신 수로 들고 다닌다. */
export type Rgb = [number, number, number];

export type StagePalette = {
  brand: Rgb;
  paper: Rgb;
  ink: Rgb;
  key: Rgb;
};

type Rect = { left: number; top: number; right: number; bottom: number };

const rgba = ([r, g, b]: Rgb, alpha = 1) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const DOT_GAP = 10;
const DOT_RADIUS = 1;
const MASCOT_PATH =
  'M30,44H24A12,12 0 0 1 12,32V20A12,12 0 0 1 24,8H40A12,12 0 0 1 52,20V44C52,51 50,56 44,56H16';
let mascotBody: Path2D | undefined;

/**
 * 완성 중 표지 한 프레임을 그린다. 바탕에 옅은 점을 깔고, 막에 맞는 소품과 그림자, 마스코트를 차례로 얹는다.
 * 크기와 자리는 표지 폭(unit)에 대한 비율이라 표지 폭이 바뀌어도 구도가 같다.
 *
 * @param layer 소품 묶음을 한 장으로 그린 뒤 투명도를 입힐 때 쓰는 같은 크기의 캔버스다.
 * @param lookAt 포인터가 표지 위에 있으면 그 자리(폭 단위 좌표)다. 마스코트가 그쪽을 본다.
 */
export function drawStoryCompletingStage(
  ctx: CanvasRenderingContext2D,
  layer: CanvasRenderingContext2D,
  width: number,
  height: number,
  millis: number,
  palette: StagePalette,
  lookAt: Point | null,
) {
  const { act, actMillis, pose } = completingMoment(millis);
  const unit = width;

  ctx.clearRect(0, 0, width, height);
  drawDots(ctx, width, height, palette.ink);

  const stage = { ctx, layer, unit, palette };

  if (act === 'KEYWORDS') drawKeywordChips(stage, actMillis);

  if (act === 'STORYLINE') drawStorylines(stage, actMillis);

  if (act === 'TYPING') drawManuscript(stage, actMillis);

  if (act === 'PAINTING') drawPainting(stage, actMillis);

  // 칩을 밟고 있을 때는 바닥 그림자가 허공에 뜬 것처럼 보여 두지 않는다.
  if (act !== 'KEYWORDS') drawShadow(ctx, pose, unit, palette.brand);

  drawMascot(ctx, pose, unit, palette.brand, blinkOpenness(millis), lookAt);

  if (act === 'TYPING') drawKeyboard(stage, actMillis);
}

type Stage = {
  ctx: CanvasRenderingContext2D;
  layer: CanvasRenderingContext2D;
  unit: number;
  palette: StagePalette;
};

/**
 * 소품 묶음을 따로 그린 뒤 투명도를 한 번에 입힌다. 겹치는 붓질·둥근 선 끝을 각각 반투명하게 그리면 겹친
 * 자리만 진해지므로, 소품은 불투명하게 그리고 투명도는 여기서 준다.
 */
function withAlpha(
  stage: Stage,
  alpha: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  if (alpha <= 0) return;

  if (alpha >= 1) {
    draw(stage.ctx);

    return;
  }

  const { layer, ctx } = stage;

  layer.save();
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layer.restore();
  draw(layer);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** pivot 을 붙잡고 scale 배로 키운 채 그린다. */
function scaled(
  ctx: CanvasRenderingContext2D,
  scale: number,
  pivot: Point,
  draw: () => void,
) {
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.scale(scale, scale);
  ctx.translate(-pivot.x, -pivot.y);
  draw();
  ctx.restore();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ink: Rgb,
) {
  const columns = Math.floor(width / DOT_GAP);
  const rows = Math.floor(height / DOT_GAP);
  const left = (width - columns * DOT_GAP) / 2;
  const top = (height - rows * DOT_GAP) / 2;

  ctx.fillStyle = rgba(ink, 0.45);

  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      ctx.beginPath();
      ctx.arc(
        left + column * DOT_GAP,
        top + row * DOT_GAP,
        DOT_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

/** 바닥에 깔리는 그림자다. 높이 뜰수록 작고 옅어진다. */
function drawShadow(
  ctx: CanvasRenderingContext2D,
  pose: MascotPose,
  unit: number,
  brand: Rgb,
) {
  const height = clamp01((FLOOR - pose.y) / 0.9);
  const width = MASCOT_SIZE * 0.62 * (1 - 0.5 * height) * pose.scaleX * unit;

  ctx.fillStyle = rgba(brand, 0.16 * (1 - 0.7 * height));
  ctx.beginPath();
  ctx.ellipse(
    pose.x * unit,
    FLOOR * unit,
    width / 2,
    0.012 * unit,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/**
 * 로고 심벌을 움직이는 마스코트로 그린다. 찌그러뜨림은 발을 붙잡고, 회전은 몸 가운데를 축으로 한다.
 * 포인터가 표지 위에 있으면 눈이 포인터 쪽을 본다.
 */
function drawMascot(
  ctx: CanvasRenderingContext2D,
  pose: MascotPose,
  unit: number,
  brand: Rgb,
  blink: number,
  lookAt: Point | null,
) {
  mascotBody ??= new Path2D(MASCOT_PATH);

  const cell = (MASCOT_SIZE * unit) / MASCOT_VIEWPORT;
  const look = lookAt ? lookToward(pose, lookAt) : pose.look;

  ctx.save();
  ctx.translate(
    pose.x * unit - MASCOT_CENTER * cell,
    pose.y * unit - MASCOT_BOTTOM * cell,
  );
  ctx.translate(MASCOT_CENTER * cell, MASCOT_CENTER * cell);
  ctx.rotate((pose.rotation * Math.PI) / 180);
  ctx.translate(-MASCOT_CENTER * cell, -MASCOT_CENTER * cell);
  ctx.translate(MASCOT_CENTER * cell, MASCOT_BOTTOM * cell);
  ctx.scale(pose.scaleX, pose.scaleY);
  ctx.translate(-MASCOT_CENTER * cell, -MASCOT_BOTTOM * cell);
  ctx.scale(cell, cell);
  ctx.strokeStyle = rgba(brand);
  ctx.fillStyle = rgba(brand);
  ctx.lineWidth = 7.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(mascotBody);

  const openness = Math.max(blink * (1 - 0.9 * pose.squint), 0.1);

  for (const eyeX of [25, 39]) {
    ctx.beginPath();
    ctx.ellipse(
      eyeX + look.x * 2,
      24 + look.y * 2,
      4,
      4 * openness,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

/** 눈 가운데에서 포인터로 향하는 방향을 길이 1 이하로 반환한다. */
function lookToward(pose: MascotPose, target: Point): Point {
  const eyeY = pose.y - MASCOT_SIZE * ((MASCOT_BOTTOM - 24) / MASCOT_VIEWPORT);
  const dx = target.x - pose.x;
  const dy = target.y - eyeY;
  const length = Math.hypot(dx, dy);

  return length < 0.02
    ? { x: 0, y: 0 }
    : { x: dx / Math.max(length, 0.15), y: dy / Math.max(length, 0.15) };
}

/** 원고·키보드·카드·칩·액자가 함께 쓰는 종이다. 다크 테마에서도 바탕과 갈리도록 진한 경계로 두른다. */
function drawCard(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  unit: number,
  outline: Rgb,
  fill: Rgb,
  corner = 0.04,
) {
  ctx.beginPath();
  ctx.roundRect(
    rect.left * unit,
    rect.top * unit,
    (rect.right - rect.left) * unit,
    (rect.bottom - rect.top) * unit,
    corner * unit,
  );
  ctx.fillStyle = rgba(fill);
  ctx.fill();
  ctx.lineWidth = 0.008 * unit;
  ctx.strokeStyle = rgba(outline);
  ctx.stroke();
}

function line(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  color: Rgb,
  unit: number,
) {
  ctx.beginPath();
  ctx.moveTo(from.x * unit, from.y * unit);
  ctx.lineTo(to.x * unit, to.y * unit);
  ctx.lineWidth = width * unit;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(color);
  ctx.stroke();
}

// ---- 키워드와 스토리라인 ----

/** 키워드 칩 무리다. 마스코트가 밟은 칩은 그 순간 브랜드 색으로 채워지며 통 튄다. */
function drawKeywordChips(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;

  withAlpha(stage, 1 - cueProgress('KEYWORDS_LEAVE', actMillis), (ctx) => {
    KEYWORD_CHIPS.forEach((chip, index) => {
      const enter = propVisibility('KEYWORDS', actMillis, index * 45);

      if (enter <= 0) return;

      const pick = PICKED_CHIPS.find(([chipIndex]) => chipIndex === index);
      const since = pick ? actMillis - cueStart(pick[1]) : -1;
      const picked = since >= 0;
      const pop = picked
        ? 1 + 0.14 * Math.sin(Math.PI * clamp01(since / 240))
        : 1;
      const rect = { ...chip, bottom: chip.top + CHIP_HEIGHT };
      const center = {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
      };

      scaled(
        ctx,
        enter * pop,
        { x: center.x * unit, y: center.y * unit },
        () => {
          const color = picked ? palette.brand : palette.ink;

          drawCard(
            ctx,
            rect,
            unit,
            color,
            picked ? palette.brand : palette.paper,
            CHIP_HEIGHT / 2,
          );

          const word = (rect.right - rect.left) * 0.25;

          line(
            ctx,
            { x: center.x - word, y: center.y },
            { x: center.x + word, y: center.y },
            0.018,
            picked ? palette.paper : palette.ink,
            unit,
          );
        },
      );
    });
  });
}

/** 스토리라인 카드 세 장이다. 올려다보는 카드는 물들며 뜨고, 머리로 받은 카드에 고른 표시가 붙는다. */
function drawStorylines(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;
  const pickAt = cueStart('STORYLINE_PICK') + cueMillis('STORYLINE_PICK') / 2;
  const sincePick = actMillis - pickAt;

  STORYLINE_LEFTS.forEach((left, index) => {
    const enter = propVisibility('STORYLINE', actMillis, index * 90);
    const hover =
      index === 0
        ? Math.sin(Math.PI * cueProgress('STORYLINE_1_LOOK', actMillis))
        : index === 2
          ? Math.sin(Math.PI * cueProgress('STORYLINE_3_LOOK', actMillis))
          : 0;
    const chosen = index === PICKED_STORYLINE && sincePick >= 0 ? 1 : 0;
    const dimmed = index !== PICKED_STORYLINE ? clamp01(sincePick / 300) : 0;
    const bump = chosen * Math.sin(Math.PI * clamp01(sincePick / 260)) * 0.05;
    const rise = (1 - enter) * 0.12 - hover * 0.015 - bump + dimmed * 0.03;

    withAlpha(stage, clamp01(enter) * (1 - 0.65 * dimmed), (ctx) => {
      ctx.save();
      ctx.translate(0, rise * unit);

      const rect = {
        left,
        top: STORYLINE_TOP,
        right: left + STORYLINE_WIDTH,
        bottom: STORYLINE_BOTTOM,
      };
      const highlight = Math.max(hover, chosen);

      drawCard(
        ctx,
        rect,
        unit,
        mix(palette.ink, palette.brand, highlight),
        palette.paper,
      );
      [0.62, 1, 0.82, 1, 0.7].forEach((width, row) => {
        const title = row === 0;
        const y = rect.top + 0.07 + row * 0.06 + (title ? 0 : 0.02);
        const color = title
          ? mix(palette.ink, palette.brand, highlight)
          : palette.ink;

        line(
          ctx,
          { x: left + 0.04, y },
          { x: left + 0.04 + (STORYLINE_WIDTH - 0.08) * width, y },
          title ? 0.024 : 0.014,
          color,
          unit,
        );
      });

      if (chosen)
        drawCheckBadge(
          ctx,
          { x: rect.right - 0.02, y: rect.top + 0.02 },
          0.045 * easeOutBack(clamp01(sincePick / 260)),
          unit,
          palette,
        );

      ctx.restore();
    });
  });
}

function drawCheckBadge(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  unit: number,
  palette: StagePalette,
) {
  if (radius <= 0) return;

  ctx.fillStyle = rgba(palette.brand);
  ctx.beginPath();
  ctx.arc(center.x * unit, center.y * unit, radius * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(
    (center.x - radius * 0.42) * unit,
    (center.y + radius * 0.02) * unit,
  );
  ctx.lineTo(
    (center.x - radius * 0.1) * unit,
    (center.y + radius * 0.34) * unit,
  );
  ctx.lineTo(
    (center.x + radius * 0.45) * unit,
    (center.y - radius * 0.3) * unit,
  );
  ctx.lineWidth = radius * 0.26 * unit;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(palette.paper);
  ctx.stroke();
}

// ---- 타자 ----

const PAPER: Rect = { left: 0.2, top: 0.24, right: 0.8, bottom: 0.84 };
const KEYBOARD: Rect = {
  left: 0.16,
  top: FLOOR - 0.085,
  right: 0.84,
  bottom: FLOOR + 0.075,
};
const LINE_WIDTHS = [0.62, 1, 0.9, 1, 0.55];
const KEY_INSET = 0.024;
const KEY_GAP = 0.012;

/** 원고와 키보드가 함께 나타났다가, 다 쓰고 기뻐 뛰는 동안 함께 사라진다. */
function writingVisibility(actMillis: number) {
  const enter = easeOutBack(clamp01(actMillis / 320));
  const exit = clamp01((actMillis - cueStart('TYPING_DONE') - 140) / 360);

  return enter * (1 - exit);
}

function drawManuscript(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;
  const visibility = writingVisibility(actMillis);

  withAlpha(stage, clamp01(visibility), (ctx) => {
    scaled(
      ctx,
      0.8 + 0.2 * visibility,
      { x: 0.5 * unit, y: PAPER.bottom * unit },
      () => {
        drawCard(ctx, PAPER, unit, palette.ink, palette.paper);

        const [stroke, progress] = keystrokeAt(actMillis);
        const typingStart = cueStart('TYPING');
        const typing =
          actMillis >= typingStart && actMillis < cueStart('TYPING_DONE');
        const typed =
          actMillis < typingStart
            ? 0
            : Math.min(
                (stroke + clamp01((progress - 0.5) * 2)) / KEYSTROKES,
                1,
              );
        let remaining =
          typed * LINE_WIDTHS.reduce((sum, width) => sum + width, 0);
        const innerLeft = PAPER.left + 0.07;
        const innerWidth = PAPER.right - PAPER.left - 0.14;

        LINE_WIDTHS.forEach((width, index) => {
          const shown = Math.min(Math.max(remaining, 0), width);
          const writingHere = typing && remaining >= 0 && remaining < width;

          remaining -= width;

          const title = index === 0;
          const y = PAPER.top + 0.1 + index * 0.1 + (title ? 0 : 0.03);

          if (shown > 0)
            line(
              ctx,
              { x: innerLeft, y },
              { x: innerLeft + innerWidth * shown, y },
              title ? 0.034 : 0.022,
              title ? mix(palette.paper, palette.brand, 0.75) : palette.ink,
              unit,
            );

          if (writingHere && Math.floor(actMillis / 260) % 2 === 0) {
            const x = innerLeft + innerWidth * shown + 0.03;

            line(
              ctx,
              { x, y: y - 0.03 },
              { x, y: y + 0.03 },
              0.012,
              palette.brand,
              unit,
            );
          }
        });
      },
    );
  });
}

/** 마스코트 앞을 가리는 키보드다. 아래에서 밀려 올라오고, 방금 누른 키가 브랜드 색으로 빛났다 꺼진다. */
function drawKeyboard(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;
  const visibility = writingVisibility(actMillis);

  withAlpha(stage, clamp01(visibility), (ctx) => {
    ctx.save();
    ctx.translate(0, (1 - visibility) * 0.25 * unit);
    drawCard(ctx, KEYBOARD, unit, palette.ink, palette.paper);

    const [stroke, progress] = keystrokeAt(actMillis);
    const typing =
      actMillis >= cueStart('TYPING') && actMillis < cueStart('TYPING_DONE');
    const keyWidth =
      (KEYBOARD.right -
        KEYBOARD.left -
        2 * KEY_INSET -
        (KEY_COLUMNS - 1) * KEY_GAP) /
      KEY_COLUMNS;
    const keyHeight =
      (KEYBOARD.bottom - KEYBOARD.top - 2 * KEY_INSET - 2 * KEY_GAP) / 3;

    for (let key = 0; key < KEY_COUNT; key += 1) {
      let glow = 0;

      if (typing && key === keyFor(stroke))
        glow = clamp01((progress - 0.35) / 0.15);
      else if (typing && stroke > 0 && key === keyFor(stroke - 1))
        glow = 1 - clamp01(progress / 0.4);

      const isSpace = key === KEY_COUNT - 1;
      const column = isSpace ? 1.5 : key % KEY_COLUMNS;
      const row = isSpace ? 2 : Math.floor(key / KEY_COLUMNS);
      const width = isSpace ? keyWidth * 4 + KEY_GAP * 3 : keyWidth;
      const left = KEYBOARD.left + KEY_INSET + column * (keyWidth + KEY_GAP);
      const top =
        KEYBOARD.top + KEY_INSET + row * (keyHeight + KEY_GAP) + glow * 0.006;

      ctx.beginPath();
      ctx.roundRect(
        left * unit,
        top * unit,
        width * unit,
        keyHeight * unit,
        0.012 * unit,
      );
      ctx.fillStyle = rgba(mix(palette.key, palette.brand, glow));
      ctx.fill();
    }

    ctx.restore();
  });
}

// ---- 그림 ----

const FRAME: Rect = { left: 0.12, top: 0.12, right: 0.88, bottom: 0.74 };
/** 붓질 하나를 나누는 마디 수다. 마디마다 굵기를 바꿔 붓이 눌렸다 들리는 결을 낸다. */
const BRUSH_STEPS = 40;
/** 물감을 찍은 자리 둘레에 튀는 작은 방울의 거리와 반지름이다. */
const SPECKLES: [number, number, number][] = [
  [-0.12, 0.03, 0.009],
  [0.11, -0.06, 0.007],
  [0.08, 0.1, 0.011],
  [-0.07, -0.09, 0.006],
  [0.15, 0.04, 0.005],
];

/**
 * 액자 그림이다. 먼 능선을 옅게, 가까운 능선을 진하게 긋고, 하늘에 물감을 찍어 번지게 한 뒤 구석에 서명한다.
 * 아이콘처럼 정해진 모양을 따라 그리지 않고, 붓이 눌렸다 들리는 굵기와 수채 번짐으로 그린다.
 */
function drawPainting(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;
  const visibility = propVisibility('PAINTING', actMillis);

  withAlpha(stage, clamp01(visibility), (ctx) => {
    scaled(
      ctx,
      0.8 + 0.2 * visibility,
      { x: 0.5 * unit, y: FRAME.bottom * unit },
      () => {
        drawCard(ctx, FRAME, unit, palette.ink, palette.paper);

        const sinceBloom = actMillis - cueStart('BLOOM');
        const wash = clamp01(sinceBloom / 700);

        if (wash > 0) drawWash(ctx, wash, unit, palette.brand);

        drawBloom(ctx, sinceBloom, unit, palette);
        drawBrushStroke(
          ctx,
          STROKE_1,
          cueProgress('STROKE_1', actMillis),
          0.04,
          mix(palette.paper, palette.brand, 0.5),
          unit,
        );
        drawBrushStroke(
          ctx,
          STROKE_2,
          cueProgress('STROKE_2', actMillis),
          0.05,
          palette.brand,
          unit,
        );
        drawBrushStroke(
          ctx,
          SIGNATURE,
          cueProgress('SIGNATURE', actMillis),
          0.014,
          palette.brand,
          unit,
        );
      },
    );
  });
}

/** 붓질 하나를 progress 만큼 긋는다. 굵기는 곡선 위의 자리로 정해져 양 끝은 가늘고 가운데가 굵다. */
function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  curve: Cubic,
  progress: number,
  maxWidth: number,
  color: Rgb,
  unit: number,
) {
  if (progress <= 0) return;

  let previous = cubicAt(curve, 0);

  for (let step = 1; step <= Math.ceil(BRUSH_STEPS * progress); step += 1) {
    const t = Math.min(step / BRUSH_STEPS, progress);
    const next = cubicAt(curve, t);
    const middle = clamp01(t - 0.5 / BRUSH_STEPS);
    const pressure = 0.18 + 0.82 * Math.sin(Math.PI * middle) ** 0.7;

    line(ctx, previous, next, maxWidth * pressure, color, unit);
    previous = next;
  }
}

function bezierTo(ctx: CanvasRenderingContext2D, curve: Cubic, unit: number) {
  ctx.bezierCurveTo(
    curve.control1.x * unit,
    curve.control1.y * unit,
    curve.control2.x * unit,
    curve.control2.y * unit,
    curve.end.x * unit,
    curve.end.y * unit,
  );
}

/** 두 능선 사이를 수채 물로 옅게 적신다. 가장자리를 두 붓질이 감싸 네모난 테두리 없이 물이 고인 모양이 된다. */
function drawWash(
  ctx: CanvasRenderingContext2D,
  amount: number,
  unit: number,
  brand: Rgb,
) {
  ctx.beginPath();
  ctx.moveTo(STROKE_1.start.x * unit, STROKE_1.start.y * unit);
  bezierTo(ctx, STROKE_1, unit);
  ctx.lineTo(STROKE_2.start.x * unit, STROKE_2.start.y * unit);
  bezierTo(ctx, STROKE_2, unit);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0.42 * unit, 0, 0.7 * unit);

  gradient.addColorStop(0, rgba(brand, 0.24 * amount));
  gradient.addColorStop(1, rgba(brand, 0.06 * amount));
  ctx.fillStyle = gradient;
  ctx.fill();
}

/** 물감을 찍은 자리가 둥글게 번지고, 가운데 물감 자국 둘레로 작은 방울이 차례로 튄다. */
function drawBloom(
  ctx: CanvasRenderingContext2D,
  sinceBloom: number,
  unit: number,
  palette: StagePalette,
) {
  const spread = clamp01((sinceBloom - 60) / 700);

  if (spread <= 0) return;

  const eased = 1 - (1 - spread) ** 3;
  const x = BLOOM_CENTER.x * unit;
  const y = BLOOM_CENTER.y * unit;
  const glow = 0.12 * eased * unit;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow);

  gradient.addColorStop(0, rgba(palette.brand, 0.42));
  gradient.addColorStop(0.5, rgba(palette.brand, 0.14));
  gradient.addColorStop(1, rgba(palette.brand, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(mix(palette.paper, palette.brand, 0.55));
  ctx.beginPath();
  ctx.arc(x, y, 0.035 * eased * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(mix(palette.paper, palette.brand, 0.6));
  SPECKLES.forEach(([dx, dy, radius], index) => {
    const pop = easeOutBack(clamp01((sinceBloom - 140 - index * 60) / 260));

    if (pop <= 0) return;

    ctx.beginPath();
    ctx.arc(
      (BLOOM_CENTER.x + dx) * unit,
      (BLOOM_CENTER.y + dy) * unit,
      radius * pop * unit,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}
