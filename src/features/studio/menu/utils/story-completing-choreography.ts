/**
 * 스토리 완성 중 표지에서 마스코트가 연기하는 안무다. 키워드를 고르고, 스토리라인을 고르고, 원고를 쓰고,
 * 그림을 그린 뒤 신나서 뛰어다니는 순서로 제작 과정을 따라가고, 바쁜 막 사이마다 쉰다.
 *
 * 좌표는 표지 폭을 1 로 둔 값이다(3:4 라 높이는 4/3). 시간 → 자세가 순수 함수라 그리는 쪽은 매 프레임 이
 * 값을 읽기만 한다. 막은 모두 바닥 가운데(`HOME`)에서 시작해 같은 자리로 돌아와, 막의 순서를 바꾸거나 막을
 * 빼도 이음매에서 마스코트가 순간이동하지 않는다. Android 와 같은 값을 쓴다.
 */

export type Point = { x: number; y: number };

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
};

export type CompletingAct =
  | 'KEYWORDS'
  | 'STORYLINE'
  | 'TYPING'
  | 'PAINTING'
  | 'BOUNCING'
  | 'WALL_JUMP'
  | 'INTERLUDE';

/** 소품이 마스코트의 동작에 맞춰 바뀌는 순간이다. */
export type Cue =
  | 'KEYWORD_1'
  | 'KEYWORD_2'
  | 'KEYWORD_3'
  | 'KEYWORDS_LEAVE'
  | 'STORYLINE_1_LOOK'
  | 'STORYLINE_3_LOOK'
  | 'STORYLINE_PICK'
  | 'TYPING'
  | 'TYPING_DONE'
  | 'STROKE_1'
  | 'STROKE_2'
  | 'BLOOM'
  | 'SIGNATURE';

export type CompletingMoment = {
  act: CompletingAct;
  actMillis: number;
  pose: MascotPose;
};

// ---- 무대 ----

/** 심벌 viewport(64) 안에서 몸이 차지하는 폭·높이와, 회전축(몸 가운데)이 발에서 떨어진 거리다. */
export const MASCOT_VIEWPORT = 64;
export const MASCOT_CENTER = 32;
export const MASCOT_BOTTOM = 59.8;

const MASCOT_WIDTH_RATIO = (55.8 - 8.2) / 64;
const MASCOT_HEIGHT_RATIO = (59.8 - 4.2) / 64;
const MASCOT_CENTER_TO_FEET_RATIO = (59.8 - 32) / 64;

export const STAGE_HEIGHT = 4 / 3;
export const MASCOT_SIZE = 0.24;
export const FLOOR = STAGE_HEIGHT - 0.11;
export const MASCOT_HALF_WIDTH = (MASCOT_SIZE * MASCOT_WIDTH_RATIO) / 2;
export const MASCOT_HEIGHT = MASCOT_SIZE * MASCOT_HEIGHT_RATIO;

const WALL_GAP = 0.05;

export const HOME: Point = { x: 0.5, y: FLOOR };

const point = (x: number, y: number): Point => ({ x, y });
const ZERO = point(0, 0);

const pose = (
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
  ...rest,
});

/** 3차 베지어 곡선이다. 붓질의 길과 그 길을 그리는 선이 같은 값을 쓴다. */
export type Cubic = {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
};

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

const cubic = (
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

// ---- 소품 자리 ----

/** 키워드 칩. 아래 줄부터 밟고 올라가며 고른다. */
export const CHIP_HEIGHT = 0.09;
export type KeywordChip = { left: number; top: number; right: number };
export const KEYWORD_CHIPS: KeywordChip[] = [
  { left: 0.12, top: 0.34, right: 0.44 },
  { left: 0.5, top: 0.34, right: 0.88 },
  { left: 0.12, top: 0.58, right: 0.58 },
  { left: 0.64, top: 0.58, right: 0.88 },
  { left: 0.12, top: 0.82, right: 0.36 },
  { left: 0.42, top: 0.82, right: 0.7 },
  { left: 0.76, top: 0.82, right: 0.88 },
];
/** 밟는 순서대로 고르는 칩과 그 순간이다. */
export const PICKED_CHIPS: [number, Cue][] = [
  [5, 'KEYWORD_1'],
  [2, 'KEYWORD_2'],
  [1, 'KEYWORD_3'],
];

const standingOn = (chip: KeywordChip) =>
  point((chip.left + chip.right) / 2, chip.top);

/** 스토리라인 카드 세 장. 차례로 올려다보다가 가운데 카드를 머리로 받아 고른다. */
export const STORYLINE_TOP = 0.3;
export const STORYLINE_BOTTOM = 0.7;
export const STORYLINE_WIDTH = 0.26;
export const STORYLINE_LEFTS = [0.06, 0.37, 0.68];
export const PICKED_STORYLINE = 1;

/** 점프 꼭대기에서 머리가 카드 아래 변에 닿는 높이다. 머리가 닿는 순간은 점프의 한가운데다. */
const HEADBUTT_LIFT = FLOOR - STORYLINE_BOTTOM - MASCOT_HEIGHT;

/** 타자. 두 줄 7칸과 스페이스 바다. */
export const KEYSTROKE_MILLIS = 120;
export const KEYSTROKES = 20;
export const KEY_COLUMNS = 7;
export const KEY_COUNT = KEY_COLUMNS * 2 + 1;

/** 그림. 붓질 두 번, 물감 한 번, 구석에 서명한다. */
export const STROKE_1 = cubic(
  point(0.18, 0.54),
  point(0.36, 0.36),
  point(0.58, 0.68),
  point(0.82, 0.46),
);
export const STROKE_2 = cubic(
  point(0.8, 0.62),
  point(0.62, 0.52),
  point(0.42, 0.7),
  point(0.2, 0.63),
);
export const SIGNATURE = cubic(
  point(0.68, 0.69),
  point(0.71, 0.63),
  point(0.75, 0.74),
  point(0.8, 0.66),
);
export const BLOOM_CENTER = point(0.66, 0.27);

// ---- 낱동작 ----

type Move = { millis: number; cue?: Cue; pose: (f: number) => MascotPose };

type Act = { kind: CompletingAct; moves: Move[] };

const sign = Math.sign;
const PI = Math.PI;

const withCue = (move: Move, cue: Cue): Move => ({ ...move, cue });

/** 제자리에서 숨 쉬듯 살짝 오르내린다. */
const stand = (millis: number, at: Point, look: Point = ZERO): Move => ({
  millis,
  pose: (f) =>
    pose(at.x, at.y, { scaleY: 1 + 0.015 * Math.sin(2 * PI * f), look }),
});

/** 가만히 서서 천천히 숨 쉬며 glances 쪽을 차례로 둘러보고, 끝에는 다시 앞을 본다. */
const idle = (
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

/** 작은 걸음으로 통통 튀며 천천히 걸어간다. 공중에서는 좌우로 번갈아 기운다. */
const stroll = (
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

/** 기지개를 켠다. 위로 쭉 늘어나며 눈을 지그시 감았다가 돌아온다. */
const stretch = (millis: number, at: Point): Move => ({
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

/** 바닥을 누르듯 옆으로 퍼진다. 착지와 도약 준비를 같이 맡는다. */
const crouch = (
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
 */
const leap = (
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

/** 벽에 철썩 붙어 미끄러지다가 다시 웅크려 튀어 나간다. 벽 쪽 가장자리가 벽에 닿도록 발끝을 옮긴다. */
const cling = (
  millis: number,
  onLeft: boolean,
  from: number,
  to: number,
): Move => ({
  millis,
  pose: (f) => {
    const impact = Math.max(1 - f / 0.4, 0) ** 2;
    const windUp = f > 0.65 ? Math.sin((PI * (f - 0.65)) / 0.35) * 0.8 : 0;
    const squeeze = Math.max(impact, windUp);
    const scaleX = 1 - 0.22 * squeeze;
    const halfWidth = MASCOT_HALF_WIDTH * scaleX;
    const away = onLeft ? 1 : -1;

    return pose(
      onLeft ? WALL_GAP + halfWidth : 1 - WALL_GAP - halfWidth,
      from + (to - from) * f * f,
      {
        scaleX,
        scaleY: 1 + 0.12 * squeeze,
        rotation: -away * 6 * windUp,
        look: point(away * 0.9, -0.3),
        squint: 0.27 * impact,
      },
    );
  },
});

/** 몸 가운데를 축으로 도는 마스코트를 발을 축으로 돈 것처럼 보이게 놓는다. */
function pinnedAtFeet(feet: Point, rotation: number): MascotPose {
  const radians = (rotation * PI) / 180;
  const toCenter = MASCOT_SIZE * MASCOT_CENTER_TO_FEET_RATIO;

  return pose(
    feet.x + toCenter * Math.sin(radians),
    feet.y + toCenter * (1 - Math.cos(radians)),
    {
      rotation,
    },
  );
}

/** 붓 끝인 발로 곡선을 따라 긋는다. 곡선의 기울기만큼 몸을 기울이되 양 끝에서는 0 으로 모은다. */
const brush = (millis: number, curve: Cubic): Move => ({
  millis,
  pose: (f) => {
    const tangent = cubicTangent(curve, f);
    const slope = (Math.atan2(tangent.y, Math.abs(tangent.x)) * 180) / PI;
    const envelope = Math.min(1, f / 0.12, (1 - f) / 0.12);
    const rotation =
      Math.min(Math.max(-slope * 0.45, -20), 20) * sign(tangent.x) * envelope;

    return {
      ...pinnedAtFeet(cubicAt(curve, f), rotation),
      look: point(sign(tangent.x) * 0.8, 0.5),
    };
  },
});

/** 누를 키 쪽으로 몸을 숙이며 내리찍는다. 키를 누르는 순간(한 타의 가운데)에 가장 깊다. */
function typingPose(millis: number): MascotPose {
  const stroke = Math.floor(millis / KEYSTROKE_MILLIS);
  const dip = Math.sin((PI * (millis % KEYSTROKE_MILLIS)) / KEYSTROKE_MILLIS);
  const side = keySide(keyFor(stroke));

  return pose(HOME.x + side * 0.02 * dip, HOME.y + 0.01 * dip, {
    scaleX: 1 + 0.05 * dip,
    scaleY: 1 - 0.07 * dip,
    rotation: side * 8 * dip,
    look: point(side * 0.7, 0.9),
    squint: 0.2 * dip,
  });
}

/** 매번 다른 키를 고르되 같은 시간에는 늘 같은 키다. 마지막 칸은 스페이스 바다. */
export const keyFor = (stroke: number) =>
  (stroke * 11 + stroke * stroke * 3 + 4) % KEY_COUNT;

/** 키가 키보드 가운데에서 얼마나 왼쪽(-1)·오른쪽(1)에 있는지 반환한다. */
export const keySide = (key: number) =>
  key === KEY_COUNT - 1 ? 0 : ((key % KEY_COLUMNS) - 3) / 3;

// ---- 막 ----

const [firstChip, secondChip, thirdChip] = PICKED_CHIPS.map(([index]) =>
  standingOn(KEYWORD_CHIPS[index]),
);
const underFirst = point(0.19, FLOOR);
const underThird = point(0.81, FLOOR);
const hopLeft = point(0.2, FLOOR);
const hopRight = point(0.8, FLOOR);
const strolled = point(0.74, FLOOR);
const strolledLeft = point(0.26, FLOOR);
const wallLeft = WALL_GAP + MASCOT_HALF_WIDTH;
const wallRight = 1 - WALL_GAP - MASCOT_HALF_WIDTH;

const interlude = (...moves: Move[]): Act => ({ kind: 'INTERLUDE', moves });

const ACTS: Act[] = [
  {
    kind: 'KEYWORDS',
    moves: [
      stand(360, HOME, point(0, -1)),
      crouch(140, HOME),
      leap(380, HOME, firstChip, 0.1),
      withCue(crouch(150, firstChip), 'KEYWORD_1'),
      leap(340, firstChip, secondChip, 0.1),
      withCue(crouch(150, secondChip), 'KEYWORD_2'),
      leap(340, secondChip, thirdChip, 0.1),
      withCue(crouch(170, thirdChip, 1.2), 'KEYWORD_3'),
      stand(320, thirdChip, point(-0.6, 0.8)),
      withCue(leap(480, thirdChip, HOME, 0.06), 'KEYWORDS_LEAVE'),
      crouch(160, HOME),
      stand(240, HOME),
    ],
  },
  interlude(idle(1100, HOME)),
  {
    kind: 'STORYLINE',
    moves: [
      stand(460, HOME, point(0, -1)),
      leap(320, HOME, underFirst, 0.08),
      withCue(stand(440, underFirst, point(0, -1)), 'STORYLINE_1_LOOK'),
      leap(440, underFirst, underThird, 0.14),
      withCue(stand(400, underThird, point(0, -1)), 'STORYLINE_3_LOOK'),
      leap(320, underThird, HOME, 0.06),
      crouch(180, HOME, 1, point(0, -1)),
      withCue(leap(560, HOME, HOME, HEADBUTT_LIFT), 'STORYLINE_PICK'),
      crouch(160, HOME),
      stand(560, HOME, point(0, -1)),
    ],
  },
  interlude(
    stroll(1500, HOME, strolled, 4),
    idle(1000, strolled, [point(-0.8, -0.3)]),
    stroll(1150, strolled, HOME, 3),
  ),
  {
    kind: 'TYPING',
    moves: [
      stand(360, HOME, point(0, 0.8)),
      {
        millis: KEYSTROKE_MILLIS * KEYSTROKES,
        cue: 'TYPING',
        pose: (f) => typingPose(f * KEYSTROKE_MILLIS * KEYSTROKES),
      },
      withCue(crouch(140, HOME), 'TYPING_DONE'),
      leap(360, HOME, HOME, 0.16),
      crouch(120, HOME),
    ],
  },
  interlude(stretch(900, HOME), idle(600, HOME, [])),
  {
    kind: 'PAINTING',
    moves: [
      stand(320, HOME, point(0, -1)),
      crouch(140, HOME),
      leap(420, HOME, STROKE_1.start, 0.12),
      withCue(brush(820, STROKE_1), 'STROKE_1'),
      leap(260, STROKE_1.end, STROKE_2.start, 0.05),
      withCue(brush(720, STROKE_2), 'STROKE_2'),
      leap(400, STROKE_2.end, BLOOM_CENTER, 0.08),
      withCue(crouch(240, BLOOM_CENTER, 1.3), 'BLOOM'),
      leap(340, BLOOM_CENTER, SIGNATURE.start, 0.06),
      withCue(brush(380, SIGNATURE), 'SIGNATURE'),
      leap(420, SIGNATURE.end, HOME, 0.08),
      crouch(160, HOME),
      stand(560, HOME, point(0, -1)),
    ],
  },
  interlude(
    stroll(1150, HOME, strolledLeft, 3),
    idle(900, strolledLeft, [point(0.8, -0.6)]),
    stroll(1150, strolledLeft, HOME, 3),
  ),
  {
    kind: 'BOUNCING',
    moves: [
      crouch(140, HOME),
      leap(420, HOME, hopLeft, 0.28),
      crouch(130, hopLeft),
      leap(680, hopLeft, hopRight, 0.85, 1),
      crouch(170, hopRight, 1.2),
      leap(360, hopRight, HOME, 0.2),
      crouch(120, HOME),
      leap(240, HOME, HOME, 0.1),
      crouch(100, HOME),
      stand(260, HOME),
    ],
  },
  {
    kind: 'WALL_JUMP',
    moves: [
      crouch(150, HOME, 1.2),
      leap(380, HOME, point(wallLeft, 0.8), 0.18),
      cling(520, true, 0.8, 0.9),
      leap(440, point(wallLeft, 0.9), point(wallRight, 0.6), 0.16),
      cling(480, false, 0.6, 0.7),
      leap(440, point(wallRight, 0.7), HOME, 0.14, -1),
      crouch(180, HOME, 1.3),
      stand(280, HOME),
    ],
  },
  interlude(idle(1400, HOME, [point(0.8, 0), point(-0.8, 0), point(0, 0.8)])),
];

const actMillis = (act: Act) =>
  act.moves.reduce((sum, move) => sum + move.millis, 0);

export const COMPLETING_LOOP_MILLIS = ACTS.reduce(
  (sum, act) => sum + actMillis(act),
  0,
);

const CUE_SPANS = new Map<Cue, { start: number; millis: number }>();

for (const act of ACTS) {
  let start = 0;

  for (const move of act.moves) {
    if (move.cue) CUE_SPANS.set(move.cue, { start, millis: move.millis });

    start += move.millis;
  }
}

/** 한 바퀴 안의 시각에 마스코트가 어느 막에서 어떤 자세인지 반환한다. */
export function completingMoment(timeMillis: number): CompletingMoment {
  const time =
    ((timeMillis % COMPLETING_LOOP_MILLIS) + COMPLETING_LOOP_MILLIS) %
    COMPLETING_LOOP_MILLIS;
  let actStart = 0;

  for (const act of ACTS) {
    const length = actMillis(act);

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
}

/** 막의 길이를 반환한다. 소품이 막 끝에서 사라질 때 쓴다. 쉼 막에는 소품이 없다. */
export function completingActMillis(
  kind: Exclude<CompletingAct, 'INTERLUDE'>,
): number {
  return actMillis(ACTS.find((act) => act.kind === kind)!);
}

const cueSpan = (cue: Cue) => {
  const span = CUE_SPANS.get(cue);

  if (!span) throw new Error(`${cue} is not attached to a move`);

  return span;
};

/** cue 동작이 막 안에서 시작하는 시각이다. */
export const cueStart = (cue: Cue) => cueSpan(cue).start;

/** cue 동작의 길이다. */
export const cueMillis = (cue: Cue) => cueSpan(cue).millis;

/** cue 동작이 actMillis 에 얼마나 진행했는지(0..1) 반환한다. */
export function cueProgress(cue: Cue, inAct: number): number {
  const span = cueSpan(cue);

  return Math.min(Math.max((inAct - span.start) / span.millis, 0), 1);
}

/** 몇 번째 키를 누르는지와, 그 안에서 얼마나 진행했는지(0..1) 반환한다. */
export function keystrokeAt(inAct: number): [number, number] {
  const typing = Math.min(
    Math.max(inAct - cueStart('TYPING'), 0),
    KEYSTROKE_MILLIS * KEYSTROKES - 1,
  );

  return [
    Math.floor(typing / KEYSTROKE_MILLIS),
    (typing % KEYSTROKE_MILLIS) / KEYSTROKE_MILLIS,
  ];
}

/** 2.9초마다 한 번 깜빡인다. */
export function blinkOpenness(millis: number): number {
  const phase = millis % 2900;

  return phase < 2760 ? 1 : 1 - 0.9 * Math.sin((PI * (phase - 2760)) / 140);
}

/** 살짝 넘쳤다가 자리를 잡는 등장 곡선이다. */
export const easeOutBack = (t: number) =>
  1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

/**
 * 소품이 막 시작에 살짝 넘치며 나타나고 막 끝에 사라지는 정도다. 1 을 넘는 값은 등장 때의 넘침이다.
 * enterDelay 만큼 늦게 나타나 여러 소품이 차례로 튀어나온다.
 */
export function propVisibility(
  kind: Exclude<CompletingAct, 'INTERLUDE'>,
  inAct: number,
  enterDelay = 0,
): number {
  const enter = easeOutBack(
    Math.min(Math.max((inAct - enterDelay) / 320, 0), 1),
  );
  const exit = Math.min(
    Math.max((inAct - (completingActMillis(kind) - 320)) / 320, 0),
    1,
  );

  return enter * (1 - exit);
}
