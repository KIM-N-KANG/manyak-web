import {
  MASCOT_BOTTOM,
  MASCOT_CENTER,
  MASCOT_VIEWPORT,
  type MascotPose,
  type Point,
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

  if (pose.eyes === 'round') {
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
  } else {
    // 힘줄 때는 바깥에서 안쪽으로 모이는 `> <`, 웃을 때는 위로 둥근 `^ ^` 다.
    ctx.lineWidth = 3.4;
    ctx.beginPath();

    for (const [eyeX, side] of [
      [25, -1],
      [39, 1],
    ]) {
      if (pose.eyes === 'focus') {
        ctx.moveTo(eyeX + side * 4, 20);
        ctx.lineTo(eyeX - side * 3, 24);
        ctx.lineTo(eyeX + side * 4, 28);
      } else {
        ctx.moveTo(eyeX - 4.5, 26);
        ctx.quadraticCurveTo(eyeX, 19, eyeX + 4.5, 26);
      }
    }

    ctx.stroke();
  }

  ctx.restore();
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
