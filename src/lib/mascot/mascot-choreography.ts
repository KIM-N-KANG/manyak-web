/**
 * 로고 마스코트 안무의 공용 재료다. 자세 타입, 낱동작, 막을 이어 붙여 시간 → 자세를 계산하는 순수 함수를 둔다.
 * 제작 탭 완성 중 표지와 채팅 실시간 이미지 로딩이 함께 쓰고, Android 와 같은 값을 쓴다.
 *
 * 좌표는 무대 폭을 1 로 둔 값이다. 마스코트 크기(size)는 무대마다 달라 크기에 기대는 동작만 인자로 받는다.
 */

export type Point = { x: number; y: number };

/**
 * 눈 모양이다. round 는 동그란 눈, focus 는 힘주는 `> <`, smile 은 웃으며 감은 `^ ^`, sleepy 는 졸려 감긴
 * `‿ ‿`, sparkle 은 반짝이는 별 눈, wink 는 한쪽만 웃으며 감은 눈, dizzy 는 빙글빙글 도는 어지러운 눈이다.
 */
export type MascotEyes =
  | 'round'
  | 'focus'
  | 'smile'
  | 'sleepy'
  | 'sparkle'
  | 'wink'
  | 'dizzy';

/** 마스코트 한 프레임의 자세다. x·y 는 발끝 가운데다. */
export type MascotPose = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  look: Point;
  /** 0 은 뜬 눈, 1 은 지그시 감은 눈이다. */
  squint: number;
  eyes: MascotEyes;
  /** 몸에 쥔 붓을 몸 기준으로 더 돌린 각도(도)다. 0 이면 `BRUSH_TILT` 그대로다. */
  brush: number;
  /** 붓털을 누른 정도다. 0 은 뾰족한 붓털, 1 은 눌려 넓게 퍼진 붓털이다. */
  press: number;
};

/** 심벌 viewport(64) 안에서 몸이 차지하는 폭·높이와, 회전축(몸 가운데)이 발에서 떨어진 거리다. */
export const MASCOT_VIEWPORT = 64;
export const MASCOT_CENTER = 32;
export const MASCOT_BOTTOM = 59.8;
export const MASCOT_WIDTH_RATIO = (55.8 - 8.2) / 64;
export const MASCOT_HEIGHT_RATIO = (59.8 - 4.2) / 64;

const MASCOT_CENTER_TO_FEET_RATIO = (59.8 - 32) / 64;

/**
 * 점을 만든다.
 *
 * @param x 무대 폭 단위 가로 좌표
 * @param y 무대 폭 단위 세로 좌표
 * @returns 점
 */
export const point = (x: number, y: number): Point => ({ x, y });
export const ZERO = point(0, 0);

/**
 * 기본값(크기 1, 회전 0, 앞을 보는 동그란 눈)에 rest 를 덮어 자세를 만든다.
 *
 * @param x 발끝 가운데 가로 좌표
 * @param y 발끝 가운데 세로 좌표
 * @param rest 기본값을 덮을 자세 값
 * @returns 자세
 */
export const pose = (
  x: number,
  y: number,
  rest: Partial<MascotPose> = {},
): MascotPose => ({
  x,
  y,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  look: ZERO,
  squint: 0,
  eyes: 'round',
  brush: 0,
  press: 0,
  ...rest,
});

/** 3차 베지어 곡선이다. 붓질의 길과 그 길을 그리는 선이 같은 값을 쓴다. */
export type Cubic = {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
};

/**
 * 곡선 위 t 자리의 점을 반환한다.
 *
 * @param curve 곡선
 * @param t 0..1 곡선 매개변수
 * @returns 곡선 위의 점
 */
export function cubicAt(curve: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;

  return point(
    curve.start.x * a +
      curve.control1.x * b +
      curve.control2.x * c +
      curve.end.x * d,
    curve.start.y * a +
      curve.control1.y * b +
      curve.control2.y * c +
      curve.end.y * d,
  );
}

/**
 * 곡선 위 t 자리의 접선 방향(길이는 정규화하지 않음)을 반환한다.
 *
 * @param curve 곡선
 * @param t 0..1 곡선 매개변수
 * @returns 접선 벡터
 */
function cubicTangent(curve: Cubic, t: number): Point {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;

  return point(
    (curve.control1.x - curve.start.x) * a +
      (curve.control2.x - curve.control1.x) * b +
      (curve.end.x - curve.control2.x) * c,
    (curve.control1.y - curve.start.y) * a +
      (curve.control2.y - curve.control1.y) * b +
      (curve.end.y - curve.control2.y) * c,
  );
}

/**
 * 네 점으로 곡선을 만든다.
 *
 * @param start 시작점
 * @param control1 첫 조절점
 * @param control2 둘째 조절점
 * @param end 끝점
 * @returns 곡선
 */
export const cubic = (
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
): Cubic => ({
  start,
  control1,
  control2,
  end,
});

// ---- 낱동작 ----

export type Move<C extends string = never> = {
  millis: number;
  cue?: C;
  pose: (f: number) => MascotPose;
};

const sign = Math.sign;
const PI = Math.PI;

/**
 * 동작에 소품 신호를 붙인다.
 *
 * @param move 동작
 * @param cue 동작이 시작될 때 소품이 따라 바뀌는 신호
 * @returns 신호가 붙은 동작
 */
export const withCue = <C extends string>(move: Move, cue: C): Move<C> => ({
  ...move,
  cue,
});

/**
 * 동작의 눈 모양만 바꾼다.
 *
 * @param move 동작
 * @param eyes 동작 내내 쓸 눈 모양
 * @returns 눈 모양을 바꾼 동작
 */
export const withEyes = <C extends string>(
  move: Move<C>,
  eyes: MascotEyes,
): Move<C> => ({ ...move, pose: (f) => ({ ...move.pose(f), eyes }) });

/**
 * 제자리에서 숨 쉬듯 살짝 오르내린다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @param look 바라보는 쪽
 * @returns 동작
 */
export const stand = (millis: number, at: Point, look: Point = ZERO): Move => ({
  millis,
  pose: (f) =>
    pose(at.x, at.y, { scaleY: 1 + 0.015 * Math.sin(2 * PI * f), look }),
});

/**
 * 가만히 서서 천천히 숨 쉬며 glances 쪽을 차례로 둘러보고, 끝에는 다시 앞을 본다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @param glances 차례로 둘러볼 쪽
 * @returns 동작
 */
export const idle = (
  millis: number,
  at: Point,
  glances: Point[] = [point(-0.8, -0.2), point(0.8, -0.2)],
): Move => ({
  millis,
  pose: (f) => {
    const keys = [ZERO, ...glances, ZERO];
    const position = f * (keys.length - 1);
    const index = Math.min(Math.floor(position), keys.length - 2);
    const raw = Math.min(Math.max((position - index - 0.6) / 0.4, 0), 1);
    const shift = raw * raw * (3 - 2 * raw);
    const breath = Math.sin(
      2 * PI * f * Math.max(Math.round(millis / 1600), 1),
    );
    const from = keys[index];
    const to = keys[index + 1];

    return pose(at.x, at.y, {
      scaleX: 1 - 0.01 * breath,
      scaleY: 1 + 0.02 * breath,
      look: point(
        from.x + (to.x - from.x) * shift,
        from.y + (to.y - from.y) * shift,
      ),
    });
  },
});

/**
 * 작은 걸음으로 통통 튀며 천천히 걸어간다. 공중에서는 좌우로 번갈아 기운다.
 *
 * @param millis 길이
 * @param from 출발 자리
 * @param to 도착 자리
 * @param hops 걸음 수
 * @returns 동작
 */
export const stroll = (
  millis: number,
  from: Point,
  to: Point,
  hops: number,
): Move => ({
  millis,
  pose: (f) => {
    const step = f * hops;
    const index = Math.min(Math.floor(step), hops - 1);
    const phase = step - index;
    const contact = 0.28;
    const squash = phase < contact ? Math.sin((PI * phase) / contact) : 0;
    const air = phase < contact ? 0 : (phase - contact) / (1 - contact);
    const sway = index % 2 === 0 ? 1 : -1;

    return pose(
      from.x + (to.x - from.x) * f,
      from.y - 4 * air * (1 - air) * 0.035,
      {
        scaleX: 1 + 0.08 * squash,
        scaleY: 1 - 0.1 * squash + 0.03 * Math.sin(PI * air),
        rotation: sway * 5 * Math.sin(PI * air),
        look: point(sign(to.x - from.x) * 0.7, 0),
        squint: 0.13 * squash,
      },
    );
  },
});

/**
 * 기지개를 켠다. 위로 쭉 늘어나며 눈을 지그시 감았다가 돌아온다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
export const stretch = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const reach = Math.sin(PI * f) ** 2;

    return pose(at.x, at.y, {
      scaleX: 1 - 0.1 * reach,
      scaleY: 1 + 0.14 * reach,
      rotation: 5 * Math.sin(2 * PI * f) * reach,
      squint: reach,
    });
  },
});

/**
 * 바닥을 누르듯 옆으로 퍼진다. 착지와 도약 준비를 같이 맡는다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @param depth 찌그러지는 정도(1 이 기본)
 * @param look 바라보는 쪽
 * @returns 동작
 */
export const crouch = (
  millis: number,
  at: Point,
  depth = 1,
  look: Point = ZERO,
): Move => ({
  millis,
  pose: (f) => {
    const squash = Math.sin(PI * f) * depth;

    return pose(at.x, at.y, {
      scaleX: 1 + 0.16 * squash,
      scaleY: 1 - 0.2 * squash,
      look,
      squint: 0.33 * squash,
    });
  },
});

/**
 * from 에서 to 까지 포물선으로 난다. 시간에 고르게 나눈 2차 베지어가 곧 포물선이라 따로 중력을 풀지 않는다.
 * 빠르게 오르내릴수록 길게 늘어나고, spins 바퀴만큼 공중제비를 돈다.
 *
 * @param millis 길이
 * @param from 뛰는 자리
 * @param to 내려앉는 자리
 * @param lift 둘 중 높은 자리보다 더 올라가는 높이
 * @param spins 공중제비 바퀴 수(음수는 반대 방향)
 * @returns 동작
 */
export const leap = (
  millis: number,
  from: Point,
  to: Point,
  lift: number,
  spins = 0,
): Move => ({
  millis,
  pose: (f) => {
    const control = point(
      (from.x + to.x) / 2,
      Math.min(from.y, to.y) - 2 * lift,
    );
    const u = 1 - f;
    const y = from.y * u * u + control.y * 2 * f * u + to.y * f * f;
    const x = from.x * u * u + control.x * 2 * f * u + to.x * f * f;
    const velocityY = (control.y - from.y) * 2 * u + (to.y - control.y) * 2 * f;
    const fastest =
      Math.max(Math.abs(control.y - from.y), Math.abs(to.y - control.y)) * 2;
    const stretchAmount =
      fastest > 0 ? (0.08 * Math.abs(velocityY)) / fastest : 0;
    const turn = f * f * (3 - 2 * f);

    return pose(x, y, {
      scaleX: 1 - stretchAmount * 0.6,
      scaleY: 1 + stretchAmount,
      rotation: spins * 360 * turn,
      look: point(sign(to.x - from.x) * 0.8, sign(velocityY) * 0.6),
    });
  },
});

/**
 * 몸 가운데를 축으로 도는 마스코트를 발을 축으로 돈 것처럼 보이게 놓는다.
 *
 * @param feet 붙잡을 발끝 자리
 * @param rotation 회전(도)
 * @param size 마스코트 크기(무대 폭 단위)
 * @returns 자세
 */
export function pinnedAtFeet(
  feet: Point,
  rotation: number,
  size: number,
): MascotPose {
  const radians = (rotation * PI) / 180;
  const toCenter = size * MASCOT_CENTER_TO_FEET_RATIO;

  return pose(
    feet.x + toCenter * Math.sin(radians),
    feet.y + toCenter * (1 - Math.cos(radians)),
    {
      rotation,
    },
  );
}

/**
 * 마스코트가 몸에 붙여 든 소품의 한 점(심벌 viewport 좌표)이 발끝 가운데에서 얼마나 떨어져 있는지 반환한다.
 * 그리기의 변환(발을 붙잡은 찌그러뜨림, 몸 가운데 축 회전)과 같은 순서로 계산해, 소품을 무대에 놓거나 소품
 * 끝을 목표 자리에 맞출 때 쓴다.
 *
 * @param at 심벌 viewport 좌표
 * @param rotation 몸 회전(도)
 * @param scaleX 가로 찌그러짐
 * @param scaleY 세로 찌그러짐
 * @param size 마스코트 크기(무대 폭 단위)
 * @returns 발끝 가운데로부터의 거리(무대 폭 단위)
 */
export function mascotPointOffset(
  at: Point,
  rotation: number,
  scaleX: number,
  scaleY: number,
  size: number,
): Point {
  const cell = size / MASCOT_VIEWPORT;
  const center = (MASCOT_CENTER - MASCOT_BOTTOM) * cell;
  const x = (at.x - MASCOT_CENTER) * cell * scaleX;
  const y = (at.y - MASCOT_BOTTOM) * cell * scaleY - center;
  const radians = (rotation * PI) / 180;

  return point(
    x * Math.cos(radians) - y * Math.sin(radians),
    center + x * Math.sin(radians) + y * Math.cos(radians),
  );
}

// ---- 화가 소품 ----

/** 화가 베레모가 얹히는 자리(심벌 viewport 좌표)와 기울기(도)다. */
export const HAT_ANCHOR = point(30, 5.5);
export const HAT_TILT = -12;

/**
 * 몸 오른쪽에 쥔 붓이다. 쥔 자리(심벌 viewport 좌표), 붓털 끝이 향하는 쪽의 캔버스 회전(도, 0 은 바로 아래),
 * 쥔 자리에서 붓털 끝과 자루 끝까지의 길이(viewport)다.
 */
export const BRUSH_GRIP = point(64, 38);
export const BRUSH_TILT = -38;
export const BRUSH_TIP_LENGTH = 16;
export const BRUSH_HANDLE_LENGTH = 18;

/**
 * 붓털 끝이 발끝 가운데에서 얼마나 떨어져 있는지 반환한다. 쥔 자리는 몸과 함께 찌그러지고 돌지만, 붓은 찌그러지지
 * 않고 몸 회전과 붓 회전만큼 돈다. 그리기도 같은 순서로 붓을 놓는다.
 *
 * @param size 마스코트 크기(무대 폭 단위)
 * @param rotation 몸 회전(도)
 * @param scaleX 가로 찌그러짐
 * @param scaleY 세로 찌그러짐
 * @param brush 몸 기준 붓 회전(도)
 * @returns 발끝 가운데로부터의 거리(무대 폭 단위)
 */
export function brushTipOffset(
  size: number,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  brush = 0,
): Point {
  const grip = mascotPointOffset(BRUSH_GRIP, rotation, scaleX, scaleY, size);
  const radians = ((BRUSH_TILT + rotation + brush) * PI) / 180;
  const length = (BRUSH_TIP_LENGTH * size) / MASCOT_VIEWPORT;

  return point(
    grip.x - Math.sin(radians) * length,
    grip.y + Math.cos(radians) * length,
  );
}

/**
 * 붓 끝인 발로 곡선을 따라 긋는다. 곡선의 기울기만큼 몸을 기울이되 양 끝에서는 0 으로 모은다.
 *
 * @param millis 길이
 * @param curve 붓질의 길
 * @param size 마스코트 크기(무대 폭 단위)
 * @returns 동작
 */
export const brush = (millis: number, curve: Cubic, size: number): Move => ({
  millis,
  pose: (f) => {
    const tangent = cubicTangent(curve, f);
    const slope = (Math.atan2(tangent.y, Math.abs(tangent.x)) * 180) / PI;
    const envelope = Math.min(1, f / 0.12, (1 - f) / 0.12);
    const rotation =
      Math.min(Math.max(-slope * 0.45, -20), 20) * sign(tangent.x) * envelope;

    return {
      ...pinnedAtFeet(cubicAt(curve, f), rotation, size),
      look: point(sign(tangent.x) * 0.8, 0.5),
    };
  },
});

// ---- 붓길 ----

/** 격자 좌표 꺾은선과 누적 길이다. 곡선은 잘게 나눠 길이에 고르게 따라갈 수 있게 한다. */
export type Stroke = { points: Point[]; lengths: number[]; total: number };

const CURVE_STEPS = 14;

/**
 * SVG path 문자열(M·L·Q·C 절대 좌표)을 꺾은선으로 바꾼다.
 *
 * @param path 격자 좌표 path
 * @returns 꺾은선과 누적 길이
 * @throws 지원하지 않는 명령이 있으면 던진다
 */
export function parseStroke(path: string): Stroke {
  const tokens = path.match(/[MLQC]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let index = 0;
  let command = '';
  const read = () => Number(tokens[index++]);
  const readPoint = () => point(read(), read());

  while (index < tokens.length) {
    if (/[A-Z]/.test(tokens[index])) command = tokens[index++];

    const from = points[points.length - 1];

    if (command === 'M' || command === 'L') {
      points.push(readPoint());
    } else if (command === 'Q') {
      const control = readPoint();
      const end = readPoint();

      for (let step = 1; step <= CURVE_STEPS; step += 1) {
        const t = step / CURVE_STEPS;
        const u = 1 - t;

        points.push(
          point(
            from.x * u * u + control.x * 2 * t * u + end.x * t * t,
            from.y * u * u + control.y * 2 * t * u + end.y * t * t,
          ),
        );
      }
    } else if (command === 'C') {
      const control1 = readPoint();
      const control2 = readPoint();
      const end = readPoint();

      for (let step = 1; step <= CURVE_STEPS; step += 1) {
        const t = step / CURVE_STEPS;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;

        points.push(
          point(
            from.x * a + control1.x * b + control2.x * c + end.x * d,
            from.y * a + control1.y * b + control2.y * c + end.y * d,
          ),
        );
      }
    } else {
      throw new Error(`Unsupported path command: ${command}`);
    }
  }

  const lengths = [0];

  for (let i = 1; i < points.length; i += 1)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );

  return { points, lengths, total: lengths[lengths.length - 1] };
}

/**
 * 붓길 길이의 f 만큼 간 자리를 반환한다.
 *
 * @param stroke 붓길
 * @param f 0..1 길이 비율
 * @returns 격자 좌표
 */
export function strokeAt(stroke: Stroke, f: number): Point {
  const target = Math.min(Math.max(f, 0), 1) * stroke.total;
  let i = 1;

  while (i < stroke.points.length - 1 && stroke.lengths[i] < target) i += 1;

  const from = stroke.points[i - 1];
  const to = stroke.points[i];
  const span = stroke.lengths[i] - stroke.lengths[i - 1];
  const t = span > 0 ? (target - stroke.lengths[i - 1]) / span : 0;

  return point(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
}

/**
 * f 앞뒤로 붓길이 나아가는 방향의 평균을 반환한다. 꺾이거나 되돌아가는 자리에서도 값이 끊기지 않고 지나가도록
 * 짧은 마디 방향을 고르게 평균 내며, 되돌아가는 자리에서는 길이가 0 에 가까워진다.
 *
 * @param stroke 붓길
 * @param f 0..1 길이 비율
 * @returns 길이 1 이하의 평균 방향
 */
export function strokeHeading(stroke: Stroke, f: number): Point {
  const samples = 12;
  const reach = 0.025;
  let x = 0;
  let y = 0;
  let previous = strokeAt(stroke, f - reach);

  for (let step = 1; step <= samples; step += 1) {
    const next = strokeAt(stroke, f - reach + (2 * reach * step) / samples);
    const length = Math.hypot(next.x - previous.x, next.y - previous.y);

    if (length > 0) {
      x += (next.x - previous.x) / length;
      y += (next.y - previous.y) / length;
    }

    previous = next;
  }

  return point(x / samples, y / samples);
}

/** 붓질 선택 값이다. scribble 은 휘갈기기, lean 은 끌림의 가장 큰 붓 회전(도), press 는 가장 큰 누름이다. */
export type PaintOptions = {
  scribble?: boolean;
  lean?: number;
  press?: number;
};

/**
 * 붓털 끝으로 붓길을 따라 긋는다. 붓털 끝을 붓길에 붙잡은 채 나아가는 쪽으로 몸을 기울이되 양 끝에서는 바로
 * 서고, 눈은 붓끝을 본다. scribble 이면 지그재그를 휘갈기듯 몸을 좌우로 빠르게 비튼다. lean 이 있으면 붓털 끝이
 * 진행 반대쪽으로 끌리게 붓을 눕히고, press 가 있으면 붓털을 누른다. 둘 다 양 끝에서 0 으로 모은다.
 *
 * @param millis 길이
 * @param stroke 붓길(그림 격자 좌표)
 * @param toStage 그림 격자 좌표를 무대 좌표로 바꾸는 함수
 * @param size 마스코트 크기(무대 폭 단위)
 * @param options 붓질 선택 값
 * @returns 동작
 */
export const paintAlong = (
  millis: number,
  stroke: Stroke,
  toStage: (at: Point) => Point,
  size: number,
  { scribble = false, lean = 0, press = 0 }: PaintOptions = {},
): Move => ({
  millis,
  pose: (f) => {
    const direction = strokeHeading(stroke, f);
    const envelope = Math.min(1, f / 0.08, (1 - f) / 0.08);
    const wiggle = scribble ? Math.sin(2 * PI * f * 9) * envelope : 0;
    const rotation = (12 * direction.x + 6 * wiggle) * envelope;
    const scaleX = 1 + 0.06 * wiggle;
    const scaleY = 1 - 0.05 * wiggle;
    const brush = lean * direction.x * envelope;
    const target = toStage(strokeAt(stroke, f));
    const offset = brushTipOffset(size, rotation, scaleX, scaleY, brush);

    return pose(target.x - offset.x, target.y - offset.y, {
      scaleX,
      scaleY,
      rotation,
      look: point(0.7, 0.6),
      eyes: scribble ? 'focus' : 'round',
      brush,
      press: press * envelope,
    });
  },
});

// ---- 막 ----

export type Act<K extends string, C extends string> = {
  kind: K;
  moves: Move<C>[];
};

export type Moment<K extends string> = {
  act: K;
  actMillis: number;
  pose: MascotPose;
};

/**
 * 동작 길이의 합을 반환한다.
 *
 * @param moves 동작 목록
 * @returns 길이 합(ms)
 */
const movesMillis = (moves: Move<string>[]) =>
  moves.reduce((sum, move) => sum + move.millis, 0);

/**
 * 막을 차례로 이어 한 바퀴 안무를 만든다. 시각으로 막·자세를 찾고, 소품이 동작에 맞춰 바뀌는 cue 의 시작과
 * 길이를 막 안의 시각으로 알려 준다. cue 는 안무 안에서 한 번만 쓴다.
 *
 * @param acts 차례로 이어질 막
 * @returns 한 바퀴 길이와 시각 조회 함수
 */
export function createChoreography<K extends string, C extends string>(
  acts: Act<K, C>[],
) {
  const loopMillis = acts.reduce((sum, act) => sum + movesMillis(act.moves), 0);
  const cueSpans = new Map<C, { start: number; millis: number }>();

  for (const act of acts) {
    let start = 0;

    for (const move of act.moves) {
      if (move.cue) cueSpans.set(move.cue, { start, millis: move.millis });

      start += move.millis;
    }
  }

  const cueSpan = (cue: C) => {
    const span = cueSpans.get(cue);

    if (!span) throw new Error(`${cue} is not attached to a move`);

    return span;
  };

  return {
    loopMillis,

    /** 한 바퀴 안의 시각에 마스코트가 어느 막에서 어떤 자세인지 반환한다. */
    momentAt(timeMillis: number): Moment<K> {
      const time = ((timeMillis % loopMillis) + loopMillis) % loopMillis;
      let actStart = 0;

      for (const act of acts) {
        const length = movesMillis(act.moves);

        if (time < actStart + length) {
          const inAct = time - actStart;
          let moveStart = 0;

          for (const move of act.moves) {
            if (inAct < moveStart + move.millis)
              return {
                act: act.kind,
                actMillis: inAct,
                pose: move.pose((inAct - moveStart) / move.millis),
              };

            moveStart += move.millis;
          }
        }

        actStart += length;
      }

      throw new Error(`${time} is outside the loop`);
    },

    /** kind 막(같은 막이 여럿이면 첫 막)의 길이를 반환한다. */
    actMillis(kind: K): number {
      return movesMillis(acts.find((act) => act.kind === kind)!.moves);
    },

    /** cue 동작이 막 안에서 시작하는 시각이다. */
    cueStart: (cue: C) => cueSpan(cue).start,

    /** cue 동작의 길이다. */
    cueMillis: (cue: C) => cueSpan(cue).millis,

    /** cue 동작이 actMillis 에 얼마나 진행했는지(0..1) 반환한다. */
    cueProgress(cue: C, inAct: number): number {
      const span = cueSpan(cue);

      return Math.min(Math.max((inAct - span.start) / span.millis, 0), 1);
    },
  };
}

/**
 * 2.9초마다 한 번 깜빡인다.
 *
 * @param millis 안무 시작부터 흐른 시간
 * @returns 눈 뜬 정도(1 은 다 뜬 눈)
 */
export function blinkOpenness(millis: number): number {
  const phase = millis % 2900;

  return phase < 2760 ? 1 : 1 - 0.9 * Math.sin((PI * (phase - 2760)) / 140);
}

/**
 * 살짝 넘쳤다가 자리를 잡는 등장 곡선이다. 시작 전(0 이하)은 정확히 0 이라, 부동소수 오차로 아직 나오지 않은
 * 소품이 점처럼 그려지지 않는다.
 *
 * @param t 0..1 진행
 * @returns 1 을 살짝 넘었다 돌아오는 값
 */
export const easeOutBack = (t: number) =>
  t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
