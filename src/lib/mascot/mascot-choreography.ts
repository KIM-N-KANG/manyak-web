/**
 * 로고 마스코트 안무의 공용 재료다. 자세 타입, 낱동작, 막을 이어 붙여 시간 → 자세를 계산하는 순수 함수를 둔다.
 * 제작 탭 완성 중 표지와 채팅 실시간 이미지 로딩이 함께 쓰고, Android 와 같은 값을 쓴다.
 *
 * 좌표는 무대 폭을 1 로 둔 값이다. 마스코트 크기(size)는 무대마다 달라 크기에 기대는 동작만 인자로 받는다.
 */

export type Point = { x: number; y: number };

/** 눈 모양이다. round 는 동그란 눈, focus 는 힘주는 `> <`, smile 은 웃으며 감은 `^ ^` 이다. */
export type MascotEyes = 'round' | 'focus' | 'smile';

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
 * 살짝 넘쳤다가 자리를 잡는 등장 곡선이다.
 *
 * @param t 0..1 진행
 * @returns 1 을 살짝 넘었다 돌아오는 값
 */
export const easeOutBack = (t: number) =>
  1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
