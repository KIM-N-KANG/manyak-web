import {
  BRUSH_HANDLE_LENGTH,
  BRUSH_TIP_LENGTH,
  MASCOT_BOTTOM,
  MASCOT_CENTER,
  MASCOT_VIEWPORT,
  mascotPointOffset,
  type MascotPose,
  type Point,
  point,
  type Stroke,
} from './mascot-choreography';

/** sRGB 0..255 세 값이다. 색을 섞어야 해서 CSS 문자열 대신 수로 들고 다닌다. */
export type Rgb = [number, number, number];

/** 마스코트 무대가 쓰는 테마 색이다. 테마가 바뀌면 다시 읽는다. */
export type StagePalette = {
  brand: Rgb;
  paper: Rgb;
  ink: Rgb;
  key: Rgb;
  /** 연필 선처럼 종이 위에서 또렷해야 하는 회색이다. */
  pencil: Rgb;
};

/** 한 프레임을 그릴 때 함께 들고 다니는 캔버스·단위·색이다. */
export type Stage = {
  ctx: CanvasRenderingContext2D;
  layer: CanvasRenderingContext2D;
  unit: number;
  palette: StagePalette;
};

export type Rect = { left: number; top: number; right: number; bottom: number };

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

const DOT_GAP = 10;
const DOT_RADIUS = 1;
const MASCOT_PATH =
  'M30,44H24A12,12 0 0 1 12,32V20A12,12 0 0 1 24,8H40A12,12 0 0 1 52,20V44C52,51 50,56 44,56H16';
let mascotBody: Path2D | undefined;

/**
 * 색을 캔버스 색 문자열로 바꾼다.
 *
 * @param color sRGB 값
 * @param alpha 불투명도
 * @returns rgba() 문자열
 */
export const rgba = ([r, g, b]: Rgb, alpha = 1) =>
  `rgba(${r}, ${g}, ${b}, ${alpha})`;

/**
 * 두 색을 t 만큼 섞는다.
 *
 * @param a t 가 0 일 때의 색
 * @param b t 가 1 일 때의 색
 * @param t 섞는 정도
 * @returns 섞은 색
 */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * 값을 0..1 로 자른다.
 *
 * @param value 값
 * @returns 0..1 사이 값
 */
export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * 소품 묶음을 따로 그린 뒤 투명도를 한 번에 입힌다. 겹치는 붓질·둥근 선 끝을 각각 반투명하게 그리면 겹친
 * 자리만 진해지므로, 소품은 불투명하게 그리고 투명도는 여기서 준다.
 *
 * @param stage 그릴 무대
 * @param alpha 묶음 전체의 불투명도
 * @param draw 묶음을 그리는 함수. 받은 캔버스에 그린다
 */
export function withAlpha(
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

/**
 * pivot 을 붙잡고 scale 배로 키운 채 그린다.
 *
 * @param ctx 캔버스
 * @param scale 배율
 * @param pivot 붙잡을 자리(픽셀)
 * @param draw 그리는 함수
 */
export function scaled(
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

/**
 * 무대 바탕에 옅은 점을 고르게 깐다.
 *
 * @param ctx 캔버스
 * @param width 무대 폭(픽셀)
 * @param height 무대 높이(픽셀)
 * @param ink 점 색
 */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ink: Rgb,
) {
  const columns = Math.floor(width / DOT_GAP);
  const rows = Math.floor(height / DOT_GAP);
  const left = (width - columns * DOT_GAP) / 2;
  const top = (height - rows * DOT_GAP) / 2;

  ctx.fillStyle = rgba(ink, 0.25);

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

/**
 * 바닥에 깔리는 그림자다. 높이 뜰수록 작고 옅어진다.
 *
 * @param ctx 캔버스
 * @param pose 마스코트 자세
 * @param unit 무대 폭(픽셀)
 * @param size 마스코트 크기(무대 폭 단위)
 * @param floor 바닥 높이(무대 폭 단위)
 * @param brand 그림자 색
 */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  pose: MascotPose,
  unit: number,
  size: number,
  floor: number,
  brand: Rgb,
) {
  const height = clamp01((floor - pose.y) / 0.9);
  const width = size * 0.62 * (1 - 0.5 * height) * pose.scaleX * unit;

  ctx.fillStyle = rgba(brand, 0.16 * (1 - 0.7 * height));
  ctx.beginPath();
  ctx.ellipse(
    pose.x * unit,
    floor * unit,
    width / 2,
    0.05 * size * unit,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/**
 * 로고 심벌을 움직이는 마스코트로 그린다. 찌그러뜨림은 발을 붙잡고, 회전은 몸 가운데를 축으로 한다.
 * 포인터가 무대 위에 있으면 동그란 눈이 포인터 쪽을 본다.
 *
 * @param ctx 캔버스
 * @param pose 마스코트 자세
 * @param unit 무대 폭(픽셀)
 * @param size 마스코트 크기(무대 폭 단위)
 * @param brand 몸 색
 * @param blink 눈 뜬 정도
 * @param lookAt 포인터 자리(무대 폭 단위). 없으면 자세가 정한 쪽을 본다
 */
export function drawMascot(
  ctx: CanvasRenderingContext2D,
  pose: MascotPose,
  unit: number,
  size: number,
  brand: Rgb,
  blink: number,
  lookAt: Point | null,
) {
  mascotBody ??= new Path2D(MASCOT_PATH);

  const cell = (size * unit) / MASCOT_VIEWPORT;
  const look = lookAt ? lookToward(pose, lookAt, size) : pose.look;

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

  ctx.lineWidth = 3.4;

  for (const [eyeX, side] of [
    [25, -1],
    [39, 1],
  ]) {
    // 윙크는 왼눈만 뜨고 오른눈은 웃으며 감는다.
    const shape =
      pose.eyes === 'wink' ? (side < 0 ? 'round' : 'smile') : pose.eyes;

    ctx.beginPath();

    if (shape === 'round') {
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
    } else if (shape === 'focus') {
      ctx.moveTo(eyeX + side * 4, 20);
      ctx.lineTo(eyeX - side * 3, 24);
      ctx.lineTo(eyeX + side * 4, 28);
      ctx.stroke();
    } else if (shape === 'smile' || shape === 'sleepy') {
      const bend = shape === 'smile' ? -7 : 5;

      ctx.moveTo(eyeX - 4.5, 25 - bend / 3);
      ctx.quadraticCurveTo(eyeX, 25 + bend, eyeX + 4.5, 25 - bend / 3);
      ctx.stroke();
    } else if (shape === 'sparkle') {
      for (let corner = 0; corner < 8; corner += 1) {
        const radius = corner % 2 === 0 ? 6 : 1.7;
        const angle = (corner * Math.PI) / 4;

        ctx.lineTo(
          eyeX + Math.sin(angle) * radius,
          24 - Math.cos(angle) * radius,
        );
      }

      ctx.closePath();
      ctx.fill();
    } else {
      for (let step = 0; step <= 24; step += 1) {
        const t = step / 24;
        const angle = t * Math.PI * 4 * side;

        ctx.lineTo(
          eyeX + Math.cos(angle) * (0.5 + 4.3 * t),
          24 + Math.sin(angle) * (0.5 + 4.3 * t),
        );
      }

      ctx.lineWidth = 1.9;
      ctx.stroke();
      ctx.lineWidth = 3.4;
    }
  }

  ctx.restore();
}

/**
 * 마스코트 몸의 한 점(심벌 viewport 좌표)이 무대 어디에 있는지 반환한다.
 *
 * @param pose 마스코트 자세
 * @param at 심벌 viewport 좌표
 * @param size 마스코트 크기(무대 폭 단위)
 * @returns 무대 좌표
 */
export function onBody(pose: MascotPose, at: Point, size: number): Point {
  const offset = mascotPointOffset(
    at,
    pose.rotation,
    pose.scaleX,
    pose.scaleY,
    size,
  );

  return point(pose.x + offset.x, pose.y + offset.y);
}

/**
 * 무대의 at 자리로 옮겨 angle 만큼 돌리고 심벌 viewport 단위로 늘린 뒤 그린다. 마스코트가 든 소품을 몸과 같은
 * 크기로 그릴 때 쓴다.
 *
 * @param ctx 캔버스
 * @param unit 무대 폭(픽셀)
 * @param size 마스코트 크기(무대 폭 단위)
 * @param at 소품 원점 자리(무대 좌표)
 * @param angle 회전(도)
 * @param scaleX 가로 배율
 * @param draw viewport 단위로 그리는 함수
 */
export function inViewport(
  ctx: CanvasRenderingContext2D,
  unit: number,
  size: number,
  at: Point,
  angle: number,
  scaleX: number,
  draw: () => void,
) {
  const cell = (size * unit) / MASCOT_VIEWPORT;

  ctx.save();
  ctx.translate(at.x * unit, at.y * unit);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(cell * scaleX, cell);
  draw();
  ctx.restore();
}

/**
 * 살짝 한쪽으로 처진 화가 베레모다. 꼭지와 띠를 단다. 심벌 viewport 단위로 얹힐 자리를 원점으로 그린다.
 * 브랜드 색을 바탕 밝기의 반대쪽으로 섞어 테마마다 바탕과 갈리게 한다.
 *
 * @param ctx 얹힐 자리로 옮긴 캔버스
 * @param palette 테마 색
 * @param muted 무대에서 튀지 않게 연필 회색으로 칠하려면 true
 */
export function drawBeret(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  muted = false,
) {
  const [red, green, blue] = palette.paper;
  const shade = red + green + blue > 384 ? BLACK : WHITE;
  const felt = muted ? palette.pencil : mix(palette.brand, shade, 0.45);

  ctx.fillStyle = rgba(felt);
  ctx.beginPath();
  ctx.moveTo(-17, 1.5);
  ctx.bezierCurveTo(-19.5, -6, -8, -10.5, 2, -10.5);
  ctx.bezierCurveTo(12, -10.5, 20.5, -6, 17.5, 0.5);
  ctx.bezierCurveTo(15, 3.6, -13, 4.6, -17, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(
    muted ? mix(felt, shade, 0.35) : mix(palette.brand, shade, 0.65),
  );
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-15.5, 2);
  ctx.quadraticCurveTo(0, 5, 16, 1);
  ctx.stroke();
  ctx.strokeStyle = rgba(felt);
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(1, -10);
  ctx.lineTo(2.4, -14);
  ctx.stroke();
}

/**
 * 붓이다. 쥔 자리를 원점으로, 붓털 끝이 아래(+y)로 가게 심벌 viewport 단위로 그린다. 위로 자루, 쥔 자리 아래로
 * 쇠테, 그 아래로 물감 묻은 붓털이 뾰족하게 모인다.
 *
 * @param ctx 쥔 자리로 옮긴 캔버스
 * @param palette 테마 색
 * @param paint 붓털 색
 */
export function drawBrush(
  ctx: CanvasRenderingContext2D,
  palette: StagePalette,
  paint: Rgb,
) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(palette.pencil);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -BRUSH_HANDLE_LENGTH);
  ctx.lineTo(0, -2);
  ctx.stroke();
  ctx.strokeStyle = rgba(palette.ink);
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.fillStyle = rgba(paint);
  ctx.strokeStyle = rgba(palette.pencil);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2.8, 4);
  ctx.bezierCurveTo(-4.4, 8.5, -2, 12.5, 0, BRUSH_TIP_LENGTH);
  ctx.bezierCurveTo(2, 12.5, 4.4, 8.5, 2.8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * 눈 가운데에서 포인터로 향하는 방향을 길이 1 이하로 반환한다.
 *
 * @param pose 마스코트 자세
 * @param target 포인터 자리(무대 폭 단위)
 * @param size 마스코트 크기(무대 폭 단위)
 * @returns 바라보는 방향
 */
function lookToward(pose: MascotPose, target: Point, size: number): Point {
  const eyeY = pose.y - size * ((MASCOT_BOTTOM - 24) / MASCOT_VIEWPORT);
  const dx = target.x - pose.x;
  const dy = target.y - eyeY;
  const length = Math.hypot(dx, dy);

  return length < 0.02
    ? { x: 0, y: 0 }
    : { x: dx / Math.max(length, 0.15), y: dy / Math.max(length, 0.15) };
}

/**
 * 원고·키보드·카드·칩·액자·도화지가 함께 쓰는 종이다. 다크 테마에서도 바탕과 갈리도록 진한 경계로 두른다.
 *
 * @param ctx 캔버스
 * @param rect 종이 자리(무대 폭 단위)
 * @param unit 무대 폭(픽셀)
 * @param outline 테두리 색
 * @param fill 종이 색
 * @param corner 모서리 둥글기(무대 폭 단위)
 */
export function drawCard(
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

/**
 * 끝이 둥근 직선을 긋는다.
 *
 * @param ctx 캔버스
 * @param from 시작점(무대 폭 단위)
 * @param to 끝점(무대 폭 단위)
 * @param width 굵기(무대 폭 단위)
 * @param color 색
 * @param unit 무대 폭(픽셀)
 */
export function line(
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

// ---- 붓질 ----

/**
 * 붓길을 progress 만큼 긋는다. 마디마다 굵기를 바꿔 붓이 눌렸다 들리는 결을 내고, offset 이 있으면 결을 따라
 * 옆으로 비껴 긋는다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param stroke 붓길
 * @param progress 0..1 그은 길이 비율
 * @param width 가장 굵은 자리의 굵기(격자 단위)
 * @param color 색
 * @param pressure 길이 비율 → 굵기 비율
 * @param offset 길이(격자 단위) → 옆으로 비낄 거리
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number,
  width: number,
  color: Rgb,
  pressure: (s: number) => number,
  offset?: (length: number) => number,
) {
  if (progress <= 0) return;

  const end = Math.min(progress, 1) * stroke.total;
  const shift = (at: Point, index: number) => {
    if (!offset) return at;

    const from = stroke.points[Math.max(index - 1, 0)];
    const to = stroke.points[Math.min(index + 1, stroke.points.length - 1)];
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const away = offset(stroke.lengths[index]);

    return point(
      at.x - ((to.y - from.y) / length) * away,
      at.y + ((to.x - from.x) / length) * away,
    );
  };

  ctx.strokeStyle = rgba(color);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < stroke.points.length; i += 1) {
    if (stroke.lengths[i - 1] >= end) break;

    const span = stroke.lengths[i] - stroke.lengths[i - 1];
    const t = span > 0 ? Math.min((end - stroke.lengths[i - 1]) / span, 1) : 1;
    const from = shift(stroke.points[i - 1], i - 1);
    const next = shift(stroke.points[i], i);
    const to = point(
      from.x + (next.x - from.x) * t,
      from.y + (next.y - from.y) * t,
    );

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth =
      width * pressure((stroke.lengths[i - 1] + span * t * 0.5) / stroke.total);
    ctx.stroke();
  }
}

/**
 * 연필 결이다. 양 끝만 살짝 가늘고 중간은 고르되 손떨림처럼 조금씩 굵기가 바뀐다.
 *
 * @param s 0..1 길이 비율
 * @returns 굵기 비율
 */
export const pencilPressure = (s: number) =>
  (0.55 + 0.45 * Math.sin(Math.PI * s) ** 0.3) *
  (0.85 + 0.15 * Math.sin(s * 37));

/**
 * 붓 결이다. 양 끝은 가늘고 가운데가 눌려 굵다.
 *
 * @param s 0..1 길이 비율
 * @returns 굵기 비율
 */
export const brushPressure = (s: number) =>
  0.2 + 0.8 * Math.sin(Math.PI * s) ** 0.6;

/**
 * 가장자리가 물에 번진 듯 울퉁불퉁한 둥근 얼룩을 칠한다.
 *
 * @param ctx 격자 좌표로 옮긴 캔버스
 * @param center 가운데(격자 좌표)
 * @param radius 반지름(격자 단위)
 * @param color 칠할 색
 * @param seed 울퉁불퉁한 모양을 바꾸는 값
 */
export function drawWobblyBlob(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  color: string,
  seed: number,
) {
  ctx.beginPath();

  for (let step = 0; step <= 32; step += 1) {
    const angle = (step / 32) * Math.PI * 2;
    const wobble =
      1 + 0.05 * Math.sin(5 * angle + seed) + 0.04 * Math.sin(3 * angle + 1);
    const x = center.x + Math.cos(angle) * radius * wobble;
    const y = center.y + Math.sin(angle) * radius * wobble;

    if (step === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
