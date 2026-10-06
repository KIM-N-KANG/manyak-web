import {
  brushPressure,
  clamp01,
  drawBeret,
  drawBrush,
  drawCard,
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
  type Rect,
  type Rgb,
  rgba,
  scaled,
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
  parseStroke,
  type Point,
  point,
} from '@/lib/mascot/mascot-choreography';

import {
  BRUSH_CATCH,
  BRUSH_ON_FLOOR,
  CAN_CATCH,
  CAN_DROP_FROM,
  CAN_GRIP,
  CAN_SIP,
  CAN_SIP_TILT,
  CANVAS,
  CANVAS_GRID,
  CANVAS_WIDTH,
  CHIP_HEIGHT,
  type CompletingAct,
  completingMoment,
  type Cue,
  cueMillis,
  cueProgress,
  cueStart,
  FLOOR,
  KEY_COLUMNS,
  KEY_COUNT,
  keyFor,
  keystrokeAt,
  KEYSTROKES,
  KEYWORD_CHIPS,
  MASCOT_HEIGHT,
  MASCOT_SIZE,
  PICKED_CHIPS,
  PICKED_STORYLINE,
  PORTRAIT_BLUSH,
  PORTRAIT_FACE,
  PORTRAIT_HAIR,
  PORTRAIT_MOON,
  PORTRAIT_SCARF,
  PORTRAIT_SIGNATURE,
  propVisibility,
  STORYLINE_BOTTOM,
  STORYLINE_LEFTS,
  STORYLINE_TOP,
  STORYLINE_WIDTH,
} from './story-completing-choreography';

const PI = Math.PI;

/**
 * 완성 중 표지 한 프레임을 그린다. 바탕에 옅은 점을 깔고, 막에 맞는 소품과 그림자, 마스코트, 마스코트가 든
 * 소품(캔·베레모·붓)과 표정 소품(물음표·졸음·번개·어지러운 별)을 차례로 얹는다. 크기와 자리는 표지
 * 폭(unit)에 대한 비율이라 표지 폭이 바뀌어도 구도가 같다.
 *
 * @param ctx 표지 캔버스
 * @param layer 소품 묶음을 한 장으로 그린 뒤 투명도를 입힐 때 쓰는 같은 크기의 캔버스다.
 * @param width 표지 폭(픽셀)
 * @param height 표지 높이(픽셀)
 * @param millis 안무 시작부터 흐른 시간
 * @param palette 테마 색
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

  if (act === 'PAINTING') drawEasel(stage, actMillis);

  // 칩을 밟고 있을 때는 바닥 그림자가 허공에 뜬 것처럼 보여 두지 않는다.
  if (act !== 'KEYWORDS')
    drawShadow(ctx, pose, unit, MASCOT_SIZE, FLOOR, palette.brand);

  drawMascot(
    ctx,
    pose,
    unit,
    MASCOT_SIZE,
    palette.brand,
    blinkOpenness(millis),
    lookAt,
  );

  if (act === 'PAINTING') drawPainterGear(stage, actMillis, pose, millis);

  if (act === 'ENERGY') drawEnergyDrink(stage, actMillis, pose);

  drawMoodProps(stage, act, actMillis, pose, millis);

  if (act === 'TYPING') drawKeyboard(stage, actMillis);
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

// ---- 인물화 ----

/** 목도리를 두르면 함께 드러나는 목과 어깨선이다. */
const PORTRAIT_BODY = [
  'M33,66 L34,76 Q22,82 16,100',
  'M45,76 Q58,80 70,98',
].map(parseStroke);
const SCARF_TAIL = parseStroke('M31,77 C25,85 19,84 13,92');

/**
 * 막 안의 시각 기준으로 cue 동작이 얼마나 진행했는지 반환한다.
 *
 * @param cue 소품 신호
 * @param actMillis 막 안의 시각
 * @returns 0..1 진행
 */
const progressOf = (cue: Cue, actMillis: number) => cueProgress(cue, actMillis);

/**
 * 이젤에 세운 세로 캔버스와 그 위의 주인공 인물화다. 막 시작에 튀어나오고 막 끝에 사라진다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 */
function drawEasel(stage: Stage, actMillis: number) {
  const { unit, palette } = stage;
  const visibility = propVisibility('PAINTING', actMillis);

  withAlpha(stage, clamp01(visibility), (ctx) => {
    scaled(
      ctx,
      0.8 + 0.2 * visibility,
      { x: 0.5 * unit, y: FLOOR * unit },
      () => {
        for (const [top, bottom] of [
          [point(0.3, CANVAS.bottom - 0.02), point(0.26, FLOOR + 0.01)],
          [point(0.7, CANVAS.bottom - 0.02), point(0.74, FLOOR + 0.01)],
        ])
          line(ctx, top, bottom, 0.012, palette.ink, unit);

        const cell = (CANVAS_WIDTH / CANVAS_GRID) * unit;

        ctx.save();
        ctx.translate(CANVAS.left * unit, CANVAS.top * unit);
        ctx.scale(cell, cell);
        ctx.beginPath();
        ctx.roundRect(0, 0, CANVAS_GRID, (CANVAS_GRID * 4) / 3, 4);
        ctx.fillStyle = rgba(palette.paper);
        ctx.fill();
        ctx.lineWidth = 1.12;
        ctx.strokeStyle = rgba(palette.ink);
        ctx.stroke();
        drawPortrait(ctx, palette, actMillis);
        ctx.restore();
      },
    );
  });
}

/**
 * 주인공 인물화를 캔버스 격자 좌표로 그린다. 달을 찍어 번지게 하고, 바람에 날리는 머리를 굵은 붓으로 쓸고,
 * 옆얼굴을 가늘게 긋고 눈을 뜨게 한 뒤, 볼을 찍고 목도리를 두르고 서명한다.
 *
 * @param ctx 캔버스 격자 좌표로 옮긴 캔버스
 * @param palette 테마 색
 * @param actMillis 막 안의 시각
 */
function drawPortrait(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  actMillis: number,
) {
  const { brand, paper, pencil } = palette;
  const moonSince = actMillis - cueStart('MOON');
  const spread = clamp01((moonSince - 60) / 700);

  if (spread > 0) {
    const eased = 1 - (1 - spread) ** 3;

    drawWobblyBlob(ctx, PORTRAIT_MOON, 22 * eased, rgba(brand, 0.13), 1);
    ctx.fillStyle = rgba(mix(paper, brand, 0.3));
    ctx.beginPath();
    ctx.arc(PORTRAIT_MOON.x, PORTRAIT_MOON.y, 12.5 * eased, 0, PI * 2);
    ctx.fill();

    const twinkle = easeOutBack(clamp01((moonSince - 300) / 260));

    if (twinkle > 0) drawSparkle(ctx, point(74, 15), 3.2 * twinkle, brand);
  }

  const scarf = progressOf('SCARF', actMillis);

  for (const stroke of PORTRAIT_BODY)
    drawStroke(ctx, stroke, scarf, 1.4, pencil, pencilPressure);

  drawStroke(
    ctx,
    PORTRAIT_HAIR,
    progressOf('HAIR', actMillis),
    6,
    brand,
    brushPressure,
  );

  const face = progressOf('FACE', actMillis);

  drawStroke(ctx, PORTRAIT_FACE, face, 1.5, pencil, pencilPressure);

  if (face >= 1) {
    const open = easeOutBack(
      clamp01((actMillis - cueStart('FACE') - cueMillis('FACE')) / 220),
    );

    if (open > 0) {
      // 앞을 똑바로 보는 뜬 눈과 눈썹으로, 그림 속 주인공에게 또렷한 표정을 준다.
      ctx.strokeStyle = rgba(pencil);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(47.5, 43.6);
      ctx.quadraticCurveTo(51, 43.6 - 2.4 * open, 54.5, 43.6);
      ctx.moveTo(47, 39.6);
      ctx.quadraticCurveTo(51, 39.6 - 1.8 * open, 55, 39.2);
      ctx.stroke();
      ctx.fillStyle = rgba(pencil);
      ctx.beginPath();
      ctx.arc(52.4, 44.4, 1.5 * open, 0, PI * 2);
      ctx.fill();
    }
  }

  const blush = easeOutBack(clamp01((actMillis - cueStart('BLUSH')) / 260));

  if (blush > 0) {
    ctx.fillStyle = rgba(mix(paper, brand, 0.5));
    ctx.beginPath();
    ctx.ellipse(
      PORTRAIT_BLUSH.x,
      PORTRAIT_BLUSH.y,
      3.6 * blush,
      2.2 * blush,
      0,
      0,
      PI * 2,
    );
    ctx.fill();
  }

  drawStroke(
    ctx,
    PORTRAIT_SCARF,
    scarf,
    6,
    mix(paper, brand, 0.6),
    brushPressure,
  );
  drawStroke(ctx, SCARF_TAIL, (scarf - 0.5) * 2, 4.5, brand, brushPressure);
  drawStroke(
    ctx,
    PORTRAIT_SIGNATURE,
    progressOf('SIGNATURE', actMillis),
    1.3,
    brand,
    brushPressure,
  );
}

/**
 * 네 갈래로 뻗은 반짝임 별을 칠한다.
 *
 * @param ctx 캔버스
 * @param at 가운데
 * @param radius 갈래 길이
 * @param color 색
 */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  color: Rgb,
) {
  ctx.fillStyle = rgba(color);
  ctx.beginPath();

  for (let corner = 0; corner < 8; corner += 1) {
    const reach = corner % 2 === 0 ? radius : radius * 0.28;
    const angle = (corner * PI) / 4;

    ctx.lineTo(at.x + Math.sin(angle) * reach, at.y - Math.cos(angle) * reach);
  }

  ctx.closePath();
  ctx.fill();
}

// ---- 화가 소품 ----

/**
 * 베레모와 붓이다. 막 처음에 베레모가 흔들리며 떨어져 얹히고, 바닥의 붓이 점프에 맞춰 한 바퀴 돌며 손에
 * 들어온다. 그림을 마치고 뛰어오르는 순간에는 둘 다 졸업 모자처럼 하늘로 던져 화면 위로 사라진다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 * @param millis 안무 시작부터 흐른 시간
 */
function drawPainterGear(
  stage: Stage,
  actMillis: number,
  pose: MascotPose,
  millis: number,
) {
  const { ctx, unit, palette } = stage;
  const tossed = (actMillis - cueStart('TOSS')) / 1000;
  const facing = actMillis - cueStart('FACE');
  const paint =
    facing >= 0 && facing < cueMillis('FACE') ? palette.pencil : palette.brand;

  if (tossed >= 0) {
    // 던지는 순간의 자리에서 출발해 마스코트보다 빠르게 솟구치며 돈다.
    const from = completingMoment(millis - tossed * 1000).pose;
    const hat = onBody(from, HAT_ANCHOR, MASCOT_SIZE);
    const grip = onBody(from, BRUSH_GRIP, MASCOT_SIZE);

    inViewport(
      ctx,
      unit,
      MASCOT_SIZE,
      point(hat.x - 0.25 * tossed, hat.y - 2.2 * tossed + tossed * tossed),
      HAT_TILT - 540 * tossed,
      1,
      () => drawBeret(ctx, palette),
    );
    inViewport(
      ctx,
      unit,
      MASCOT_SIZE,
      point(
        grip.x + 0.3 * tossed,
        grip.y - 2.6 * tossed + 1.2 * tossed * tossed,
      ),
      BRUSH_TILT - 720 * tossed,
      1,
      () => drawBrush(ctx, palette, paint),
    );

    return;
  }

  const fall = cueProgress('HAT', actMillis);
  const hat = onBody(pose, HAT_ANCHOR, MASCOT_SIZE);

  inViewport(
    ctx,
    unit,
    MASCOT_SIZE,
    point(hat.x, hat.y - 1.2 * (1 - fall * fall)),
    HAT_TILT + pose.rotation + 22 * Math.sin(fall * PI * 2.5) * (1 - fall),
    pose.scaleX,
    () => drawBeret(ctx, palette),
  );

  const held = onBody(pose, BRUSH_GRIP, MASCOT_SIZE);
  const heldAngle = BRUSH_TILT + pose.rotation;
  const flight = clamp01(
    (actMillis - cueStart('BRUSH')) / (cueMillis('BRUSH') * BRUSH_CATCH),
  );
  const grip =
    flight >= 1
      ? held
      : point(
          BRUSH_ON_FLOOR.x + (held.x - BRUSH_ON_FLOOR.x) * flight,
          BRUSH_ON_FLOOR.y +
            (held.y - BRUSH_ON_FLOOR.y) * flight -
            0.12 * Math.sin(PI * flight),
        );

  inViewport(
    ctx,
    unit,
    MASCOT_SIZE,
    grip,
    flight >= 1 ? heldAngle : -450 + (heldAngle + 450) * flight,
    1,
    () =>
      drawBrush(
        ctx,
        palette,
        flight >= 1 ? paint : mix(palette.paper, palette.pencil, 0.25),
      ),
  );
}

// ---- 에너지 드링크 ----

/**
 * 에너지 드링크 캔이다. 위에서 돌며 떨어져 점프한 손에 들어오고, 얼굴 앞으로 들어 기울여 세 모금 마신 뒤,
 * 힘이 차오르는 순간 빙글 돌며 화면 밖으로 날아간다. 힘이 차오르는 동안 몸 둘레로 번개가 차례로 튄다.
 *
 * @param stage 무대
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 */
function drawEnergyDrink(stage: Stage, actMillis: number, pose: MascotPose) {
  const { ctx, unit, palette } = stage;
  const dropStart = cueStart('CAN_DROP');
  const catchAt = cueStart('CAN_CATCH') + cueMillis('CAN_CATCH') * CAN_CATCH;
  const drinkStart = cueStart('DRINK');
  const powerStart = cueStart('POWER_UP');

  if (actMillis < dropStart) return;

  let at: Point;
  let angle: number;

  if (actMillis < catchAt) {
    const fall = (actMillis - dropStart) / (catchAt - dropStart);
    const held = onBody(pose, CAN_GRIP, MASCOT_SIZE);

    at = point(
      CAN_DROP_FROM.x + (held.x - CAN_DROP_FROM.x) * fall,
      CAN_DROP_FROM.y + (held.y - CAN_DROP_FROM.y) * fall * fall,
    );
    angle = 200 * (1 - fall) + pose.rotation * fall;
  } else if (actMillis < powerStart) {
    const sip = cueProgress('DRINK', actMillis);
    const raise = actMillis < drinkStart ? 0 : sipRaise(sip);
    const gulp =
      sip > 0.2 && sip < 0.88 ? Math.sin(((sip - 0.2) / 0.68) * PI * 6) : 0;

    at = onBody(
      pose,
      point(
        CAN_GRIP.x + (CAN_SIP.x - CAN_GRIP.x) * raise,
        CAN_GRIP.y + (CAN_SIP.y - CAN_GRIP.y) * raise,
      ),
      MASCOT_SIZE,
    );
    angle = CAN_SIP_TILT * raise + 8 * gulp + pose.rotation;
  } else {
    const flown = (actMillis - powerStart) / 1000;
    const from = onBody(pose, CAN_SIP, MASCOT_SIZE);

    at = point(
      from.x + 0.9 * flown,
      from.y - 1.8 * flown + 0.8 * flown * flown,
    );
    angle = CAN_SIP_TILT + 900 * flown;

    drawBolts(stage, cueProgress('POWER_UP', actMillis), pose, actMillis);
  }

  if (at.x > 1.2 || at.y < -0.2) return;

  inViewport(ctx, unit, MASCOT_SIZE, at, angle, 1, () => drawCan(ctx, palette));
}

/**
 * 마시는 동안 캔을 얼굴 앞으로 들어 올린 정도다. 처음에 들어 올리고 끝까지 든다.
 *
 * @param sip 마시기 진행
 * @returns 0..1 들어 올린 정도
 */
function sipRaise(sip: number): number {
  const t = clamp01(sip / 0.2);

  return t * t * (3 - 2 * t);
}

/**
 * 번개 마크 캔이다. 가운데를 원점으로 심벌 viewport 단위로 그린다.
 *
 * @param ctx 캔 가운데로 옮긴 캔버스
 * @param palette 테마 색
 */
function drawCan(ctx: CanvasRenderingContext2D, palette: StagePalette) {
  ctx.beginPath();
  ctx.roundRect(-7.5, -12, 15, 24, 3);
  ctx.fillStyle = rgba(palette.brand);
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = rgba(palette.ink);
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = rgba(mix(palette.paper, palette.pencil, 0.35));
  ctx.beginPath();
  ctx.moveTo(-6, -12.5);
  ctx.lineTo(6, -12.5);
  ctx.stroke();
  ctx.fillStyle = rgba(palette.paper);
  ctx.beginPath();
  ctx.moveTo(1.8, -8);
  ctx.lineTo(-3.6, 1.2);
  ctx.lineTo(-0.2, 1.2);
  ctx.lineTo(-1.8, 8);
  ctx.lineTo(3.8, -1.6);
  ctx.lineTo(0.3, -1.6);
  ctx.closePath();
  ctx.fill();
}

const BOLT_ANGLES = [-70, -32, 30, 68, 112, -112];

/**
 * 힘이 차오르는 동안 몸 둘레로 번개가 차례로 튀어나와 깜빡이다가 사라진다.
 *
 * @param stage 무대
 * @param progress 힘이 차오르는 진행
 * @param pose 마스코트 자세
 * @param actMillis 막 안의 시각
 */
function drawBolts(
  stage: Stage,
  progress: number,
  pose: MascotPose,
  actMillis: number,
) {
  const { ctx, unit, palette } = stage;
  const center = point(pose.x, pose.y - MASCOT_HEIGHT * pose.scaleY * 0.55);

  BOLT_ANGLES.forEach((degrees, index) => {
    const pop = easeOutBack(clamp01((progress - index * 0.07) / 0.15));
    const fade = 1 - clamp01((progress - 0.82) / 0.18);
    const flicker = Math.floor(actMillis / 70 + index) % 3 === 0 ? 0.75 : 1;
    const size = 0.055 * pop * fade * flicker;

    if (size <= 0) return;

    const angle = (degrees * PI) / 180;
    const reach = 0.15;

    ctx.save();
    ctx.translate(
      (center.x + Math.sin(angle) * reach) * unit,
      (center.y - Math.cos(angle) * reach) * unit,
    );
    ctx.rotate(angle);
    ctx.scale(size * unit, size * unit);
    ctx.fillStyle = rgba(palette.brand);
    ctx.beginPath();
    ctx.moveTo(0.1, -1);
    ctx.lineTo(-0.4, 0.08);
    ctx.lineTo(0.02, 0.08);
    ctx.lineTo(-0.15, 1);
    ctx.lineTo(0.45, -0.18);
    ctx.lineTo(0.05, -0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

// ---- 표정 소품 ----

/**
 * 표정을 거드는 소품이다. 카드를 올려다볼 때 머리 위 물음표, 꾸벅 졸 때 피어오르는 Z, 어지러울 때 머리 위를
 * 도는 별을 그린다.
 *
 * @param stage 무대
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @param pose 마스코트 자세
 * @param millis 안무 시작부터 흐른 시간
 */
function drawMoodProps(
  stage: Stage,
  act: CompletingAct,
  actMillis: number,
  pose: MascotPose,
  millis: number,
) {
  const { ctx, unit, palette } = stage;
  const top = pose.y - MASCOT_HEIGHT * pose.scaleY;

  if (act === 'STORYLINE') {
    for (const cue of ['STORYLINE_1_LOOK', 'STORYLINE_3_LOOK'] as const) {
      const shown = Math.sin(PI * cueProgress(cue, actMillis));

      if (shown > 0)
        drawQuestion(
          ctx,
          point(pose.x + 0.075, top - 0.06),
          0.04 * easeOutBack(Math.min(shown * 1.6, 1)),
          palette.pencil,
          unit,
        );
    }
  }

  if (act === 'ENERGY') {
    const dozing = actMillis - cueStart('DOZE');

    for (let index = 0; index < 3; index += 1) {
      const life = (dozing - index * 300) / 650;

      if (life <= 0 || life >= 1 || dozing > cueMillis('DOZE')) continue;

      const size = 0.018 + 0.016 * life;
      const at = point(pose.x + 0.08 + 0.05 * life, top - 0.02 - 0.12 * life);

      ctx.save();
      ctx.globalAlpha = Math.sin(PI * life);
      ctx.beginPath();
      ctx.moveTo((at.x - size) * unit, (at.y - size) * unit);
      ctx.lineTo((at.x + size) * unit, (at.y - size) * unit);
      ctx.lineTo((at.x - size) * unit, (at.y + size) * unit);
      ctx.lineTo((at.x + size) * unit, (at.y + size) * unit);
      ctx.lineWidth = 0.009 * unit;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(palette.pencil);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (pose.eyes === 'dizzy') {
    for (let index = 0; index < 3; index += 1) {
      const angle = millis / 160 + (index * 2 * PI) / 3;

      ctx.save();
      ctx.translate(
        (pose.x + Math.cos(angle) * 0.075) * unit,
        (top - 0.03 + Math.sin(angle) * 0.022) * unit,
      );
      ctx.scale(unit, unit);
      drawSparkle(ctx, point(0, 0), 0.02, palette.brand);
      ctx.restore();
    }
  }
}

/**
 * 물음표를 긋는다. 둥근 고리와 짧은 기둥, 아래 점으로 이룬다.
 *
 * @param ctx 캔버스
 * @param at 가운데 자리(표지 좌표)
 * @param size 크기(표지 폭 단위)
 * @param color 색
 * @param unit 표지 폭(픽셀)
 */
function drawQuestion(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  color: Rgb,
  unit: number,
) {
  if (size <= 0) return;

  ctx.save();
  ctx.translate(at.x * unit, at.y * unit);
  ctx.scale(size * unit, size * unit);
  ctx.strokeStyle = rgba(color);
  ctx.fillStyle = rgba(color);
  ctx.lineWidth = 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -0.45, 0.45, PI * 1.1, PI * 2.35);
  ctx.quadraticCurveTo(0, -0.05, 0, 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0.72, 0.17, 0, PI * 2);
  ctx.fill();
  ctx.restore();
}
