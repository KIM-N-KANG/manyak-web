/**
 * 스토리 완성 중 표지에서 마스코트가 연기하는 안무다. 키워드를 고르고, 스토리라인을 고르고, 졸다가 에너지
 * 드링크를 마시고 원고를 터보로 쓴 뒤, 베레모를 쓰고 붓으로 주인공 인물화를 그리고 소품을 하늘로 던지며
 * 뛰어다니는 순서로 제작 과정을 따라가고, 바쁜 막 사이마다 쉰다.
 *
 * 좌표는 표지 폭을 1 로 둔 값이다(3:4 라 높이는 4/3). 시간 → 자세가 순수 함수라 그리는 쪽은 매 프레임 이
 * 값을 읽기만 한다. 막은 모두 바닥 가운데(`HOME`)에서 시작해 같은 자리로 돌아와, 막의 순서를 바꾸거나 막을
 * 빼도 이음매에서 마스코트가 순간이동하지 않는다. 인물화의 붓길은 캔버스 폭을 84칸으로 둔 격자의 SVG path
 * 문자열로 적는다. Android 와 같은 값을 쓴다.
 */

import {
  type Act,
  brushTipOffset,
  createChoreography,
  crouch,
  easeOutBack,
  idle,
  leap,
  MASCOT_HEIGHT_RATIO,
  MASCOT_WIDTH_RATIO,
  type MascotPose,
  type Move,
  paintAlong,
  parseStroke,
  type Point,
  point,
  pose,
  stand,
  stretch,
  type Stroke,
  strokeAt,
  stroll,
  withCue,
  withEyes,
} from '@/lib/mascot/mascot-choreography';

export type CompletingAct =
  | 'KEYWORDS'
  | 'STORYLINE'
  | 'ENERGY'
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
  | 'DOZE'
  | 'CAN_DROP'
  | 'CAN_CATCH'
  | 'DRINK'
  | 'POWER_UP'
  | 'TYPING'
  | 'TYPING_DONE'
  | 'HAT'
  | 'BRUSH'
  | 'MOON'
  | 'HAIR'
  | 'FACE'
  | 'BLUSH'
  | 'SCARF'
  | 'SIGNATURE'
  | 'TOSS';

// ---- 무대 ----

export const STAGE_HEIGHT = 4 / 3;
export const MASCOT_SIZE = 0.24;
export const FLOOR = STAGE_HEIGHT - 0.11;
export const MASCOT_HALF_WIDTH = (MASCOT_SIZE * MASCOT_WIDTH_RATIO) / 2;
export const MASCOT_HEIGHT = MASCOT_SIZE * MASCOT_HEIGHT_RATIO;

const WALL_GAP = 0.05;

export const HOME: Point = { x: 0.5, y: FLOOR };

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

/**
 * 칩 윗변 가운데, 마스코트가 칩을 밟고 서는 자리를 반환한다.
 *
 * @param chip 키워드 칩
 * @returns 발끝 가운데 자리
 */
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

/**
 * 에너지 드링크 캔. 몸 오른쪽에 쥐는 자리와, 마실 때 얼굴 앞으로 들어 기울이는 자리·기울기(심벌 viewport
 * 좌표, 도)다. 캔은 위에서 떨어지고, 점프의 CAN_CATCH 비율에서 손에 들어온다.
 */
export const CAN_GRIP = point(64, 40);
export const CAN_SIP = point(42, 20);
export const CAN_SIP_TILT = -125;
export const CAN_CATCH = 0.55;
export const CAN_DROP_FROM = point(HOME.x + 0.14, -0.12);

/** 타자. 에너지 드링크를 마셔 빠르게 두드리는 두 줄 7칸과 스페이스 바다. */
export const KEYSTROKE_MILLIS = 80;
export const KEYSTROKES = 20;
export const KEY_COLUMNS = 7;
export const KEY_COUNT = KEY_COLUMNS * 2 + 1;

/** 인물화를 그리는 이젤 위 세로 캔버스다. 격자 한 칸은 표지 폭의 0.6/84 다. */
export const CANVAS_GRID = 84;
export const CANVAS_WIDTH = 0.6;
export const CANVAS = {
  left: 0.2,
  top: 0.1,
  right: 0.2 + CANVAS_WIDTH,
  bottom: 0.1 + (CANVAS_WIDTH * 4) / 3,
};

/**
 * 캔버스 격자 좌표를 표지 좌표로 바꾼다.
 *
 * @param at 캔버스 격자 좌표
 * @returns 표지 좌표
 */
export const onCanvas = (at: Point): Point =>
  point(
    CANVAS.left + (at.x / CANVAS_GRID) * CANVAS_WIDTH,
    CANVAS.top + (at.y / CANVAS_GRID) * CANVAS_WIDTH,
  );

/** 붓을 집기 전 바닥에 누운 붓의 쥔 자리다. 붓털이 오른쪽을 향한다. */
export const BRUSH_ON_FLOOR = point(0.68, FLOOR - 0.008);
/** 붓을 낚아채는 순간이다. 점프의 이 비율에서 붓이 손에 들어온다. */
export const BRUSH_CATCH = 0.65;

/**
 * 주인공 인물화. 오른쪽을 보는 옆얼굴이 큰 달을 등지고, 머리카락과 목도리가 바람에 왼쪽으로 날린다. 달을
 * 찍어 번지게 하고, 머리를 굵은 붓으로 쓸고, 얼굴 옆선을 가늘게 긋고, 볼을 찍고, 목도리를 두르고, 구석에
 * 서명한다.
 */
export const PORTRAIT_MOON = point(58, 30);
export const PORTRAIT_HAIR = parseStroke(
  'M53,33 C48,24 34,22 27,30 C22,34 16,33 12,33 C8,33 8,37 12,38 C16,39 19,41 20,45 C15,49 12,51 10,52 C7,53 7,57 11,57 C15,57 20,58 23,60 C25,63 28,64 31,65',
);
export const PORTRAIT_FACE = parseStroke(
  'M53,33 Q57,37 56,41 L62,48.5 L57,50.5 Q59.5,52.5 57.5,54.5 Q59.5,56.5 57,58 Q58,62 53,63.5 Q49,64.5 46,64 L45,76',
);
export const PORTRAIT_BLUSH = point(51, 55);
export const PORTRAIT_SCARF = parseStroke(
  'M60,73 C52,80 41,80 33,76 C25,72 18,75 10,72',
);
export const PORTRAIT_SIGNATURE = parseStroke(
  'M58,101 C60,97 62,105 65,100 C67,96 69,103 72,99',
);

// ---- 낱동작 ----

const PI = Math.PI;

/**
 * 0..1 을 부드럽게 시작하고 멈추는 곡선으로 바꾼다.
 *
 * @param t 진행
 * @returns 0..1 곡선 값
 */
const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1);

  return c * c * (3 - 2 * c);
};

/**
 * 벽에 철썩 붙어 미끄러지다가 다시 웅크려 튀어 나간다. 벽 쪽 가장자리가 벽에 닿도록 발끝을 옮긴다.
 *
 * @param millis 길이
 * @param onLeft 왼쪽 벽이면 true
 * @param from 붙는 높이
 * @param to 미끄러져 내려온 높이
 * @returns 동작
 */
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

/**
 * 졸린 눈으로 두 번 꾸벅인다. 고개가 천천히 떨어졌다가 화들짝 돌아온다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const doze = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const phase = (f * 2) % 1;
    const nod =
      phase < 0.8 ? smooth(phase / 0.8) : 1 - smooth((phase - 0.8) / 0.2);

    return pose(at.x, at.y, {
      scaleX: 1 + 0.03 * nod,
      scaleY: 1 - 0.05 * nod,
      rotation: 9 * nod,
      look: point(0.2, 0.8),
      eyes: 'sleepy',
    });
  },
});

/**
 * 캔을 얼굴 앞으로 들어 꿀꺽꿀꺽 세 모금 마신다. 몸을 살짝 젖히고 모금마다 몸이 오르내린다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const drink = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const lean = smooth(f / 0.2) * (1 - smooth((f - 0.9) / 0.1));
    const gulp =
      f > 0.2 && f < 0.88 ? Math.sin(((f - 0.2) / 0.68) * PI * 6) : 0;

    return pose(at.x, at.y, {
      scaleX: 1 - 0.025 * gulp,
      scaleY: 1 + 0.035 * gulp,
      rotation: -7 * lean,
      look: point(0.3, -0.6),
      eyes: 'smile',
    });
  },
});

/**
 * 에너지가 차오른다. 쭉 늘어나며 부르르 떨고 눈이 별처럼 반짝인다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const powerUp = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const rise = smooth(f / 0.25) * (1 - smooth((f - 0.75) / 0.25));
    const shake = Math.sin((2 * PI * f * millis) / 38) * 0.006 * rise;

    return pose(at.x + shake, at.y, {
      scaleX: 1 - 0.08 * rise,
      scaleY: 1 + 0.12 * rise,
      look: point(0, -0.2),
      eyes: 'sparkle',
    });
  },
});

/**
 * 어지러워 고개를 좌우로 휘청이다가 차츰 바로 선다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const wobble = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) =>
    pose(at.x, at.y, {
      scaleY: 1 - 0.03 * Math.sin(PI * f),
      rotation: 12 * Math.sin(2 * PI * f * 2) * (1 - f),
      eyes: 'dizzy',
    }),
});

/**
 * 누를 키 쪽으로 몸을 숙이며 내리찍는다. 키를 누르는 순간(한 타의 가운데)에 가장 깊다.
 *
 * @param millis 타자를 시작한 뒤 흐른 시간
 * @returns 자세
 */
function typingPose(millis: number): MascotPose {
  const stroke = Math.floor(millis / KEYSTROKE_MILLIS);
  const dip = Math.sin((PI * (millis % KEYSTROKE_MILLIS)) / KEYSTROKE_MILLIS);
  const side = keySide(keyFor(stroke));

  return pose(HOME.x + side * 0.02 * dip, HOME.y + 0.01 * dip, {
    scaleX: 1 + 0.05 * dip,
    scaleY: 1 - 0.07 * dip,
    rotation: side * 8 * dip,
    look: point(side * 0.7, 0.9),
    eyes: 'focus',
  });
}

/**
 * 매번 다른 키를 고르되 같은 시간에는 늘 같은 키다. 마지막 칸은 스페이스 바다.
 *
 * @param stroke 몇 번째 타
 * @returns 키 번호
 */
export const keyFor = (stroke: number) =>
  (stroke * 11 + stroke * stroke * 3 + 4) % KEY_COUNT;

/**
 * 키가 키보드 가운데에서 얼마나 왼쪽(-1)·오른쪽(1)에 있는지 반환한다.
 *
 * @param key 키 번호
 * @returns -1..1 자리
 */
export const keySide = (key: number) =>
  key === KEY_COUNT - 1 ? 0 : ((key % KEY_COLUMNS) - 3) / 3;

/**
 * 바로 선 마스코트의 붓털 끝이 캔버스 격자 at 에 닿는 발끝 자리를 반환한다.
 *
 * @param at 캔버스 격자 좌표
 * @returns 발끝 가운데 자리
 */
function brushAt(at: Point): Point {
  const target = onCanvas(at);
  const offset = brushTipOffset(MASCOT_SIZE);

  return point(target.x - offset.x, target.y - offset.y);
}

/**
 * 붓길의 시작점이나 끝점에 붓털 끝이 닿는 발끝 자리를 반환한다.
 *
 * @param stroke 붓길
 * @param end 끝점이면 true
 * @returns 발끝 가운데 자리
 */
const tip = (stroke: Stroke, end = false) =>
  brushAt(strokeAt(stroke, end ? 1 : 0));

/**
 * 캔버스 붓길을 붓털 끝으로 따라 긋는다.
 *
 * @param millis 길이
 * @param stroke 캔버스 격자 좌표 붓길
 * @returns 동작
 */
const paint = (millis: number, stroke: Stroke) =>
  paintAlong(millis, stroke, onCanvas, MASCOT_SIZE);

/**
 * 붓길 사이를 짧게 건너뛴다.
 *
 * @param millis 길이
 * @param from 뛰는 자리
 * @param to 내려앉는 자리
 * @returns 동작
 */
const hop = (millis: number, from: Point, to: Point) =>
  leap(millis, from, to, 0.035);

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
const moon = brushAt(PORTRAIT_MOON);
const blush = brushAt(PORTRAIT_BLUSH);
const lookUp = point(0, -1);

/**
 * 소품 없이 쉬는 막을 만든다.
 *
 * @param moves 쉬는 동안의 동작
 * @returns 쉼 막
 */
const interlude = (...moves: Move[]): Act<CompletingAct, Cue> => ({
  kind: 'INTERLUDE',
  moves,
});

const ACTS: Act<CompletingAct, Cue>[] = [
  {
    kind: 'KEYWORDS',
    moves: [
      stand(360, HOME, lookUp),
      crouch(140, HOME),
      leap(380, HOME, firstChip, 0.1),
      withEyes(withCue(crouch(150, firstChip), 'KEYWORD_1'), 'smile'),
      leap(340, firstChip, secondChip, 0.1),
      withEyes(withCue(crouch(150, secondChip), 'KEYWORD_2'), 'smile'),
      leap(340, secondChip, thirdChip, 0.1),
      withEyes(withCue(crouch(170, thirdChip, 1.2), 'KEYWORD_3'), 'smile'),
      withEyes(stand(320, thirdChip, point(-0.6, 0.8)), 'wink'),
      withCue(leap(480, thirdChip, HOME, 0.06), 'KEYWORDS_LEAVE'),
      crouch(160, HOME),
      stand(240, HOME),
    ],
  },
  interlude(idle(1100, HOME)),
  {
    kind: 'STORYLINE',
    moves: [
      stand(460, HOME, lookUp),
      leap(320, HOME, underFirst, 0.08),
      withCue(stand(440, underFirst, lookUp), 'STORYLINE_1_LOOK'),
      leap(440, underFirst, underThird, 0.14),
      withCue(stand(400, underThird, lookUp), 'STORYLINE_3_LOOK'),
      leap(320, underThird, HOME, 0.06),
      crouch(180, HOME, 1, lookUp),
      withCue(leap(560, HOME, HOME, HEADBUTT_LIFT), 'STORYLINE_PICK'),
      withEyes(crouch(160, HOME), 'sparkle'),
      withEyes(stand(560, HOME, lookUp), 'sparkle'),
    ],
  },
  interlude(
    withEyes(stroll(1500, HOME, strolled, 4), 'smile'),
    idle(1000, strolled, [point(-0.8, -0.3)]),
    withEyes(stroll(1150, strolled, HOME, 3), 'smile'),
  ),
  {
    kind: 'ENERGY',
    moves: [
      withCue(doze(1000, HOME), 'DOZE'),
      withCue(stand(280, HOME, lookUp), 'CAN_DROP'),
      crouch(110, HOME, 1, point(0.4, -0.8)),
      withCue(leap(380, HOME, HOME, 0.1), 'CAN_CATCH'),
      crouch(120, HOME),
      withCue(drink(1250, HOME), 'DRINK'),
      withCue(powerUp(800, HOME), 'POWER_UP'),
    ],
  },
  {
    kind: 'TYPING',
    moves: [
      withEyes(stand(300, HOME, point(0, 0.8)), 'sparkle'),
      {
        millis: KEYSTROKE_MILLIS * KEYSTROKES,
        cue: 'TYPING',
        pose: (f) => typingPose(f * KEYSTROKE_MILLIS * KEYSTROKES),
      },
      withCue(crouch(140, HOME), 'TYPING_DONE'),
      withEyes(leap(360, HOME, HOME, 0.16), 'smile'),
      withEyes(crouch(120, HOME), 'smile'),
    ],
  },
  interlude(stretch(900, HOME), idle(600, HOME, [])),
  {
    kind: 'PAINTING',
    moves: [
      withCue(stand(320, HOME, lookUp), 'HAT'),
      withEyes(crouch(140, HOME, 1.1), 'smile'),
      stand(160, HOME, point(0.8, 0.8)),
      crouch(110, HOME, 1, point(0.8, 0.8)),
      withCue(leap(360, HOME, HOME, 0.08), 'BRUSH'),
      crouch(110, HOME),
      leap(420, HOME, moon, 0.1),
      withCue(crouch(240, moon, 1.2), 'MOON'),
      hop(150, moon, tip(PORTRAIT_HAIR)),
      withCue(paint(800, PORTRAIT_HAIR), 'HAIR'),
      hop(170, tip(PORTRAIT_HAIR, true), tip(PORTRAIT_FACE)),
      withCue(paint(560, PORTRAIT_FACE), 'FACE'),
      hop(140, tip(PORTRAIT_FACE, true), blush),
      withCue(crouch(180, blush, 0.9), 'BLUSH'),
      hop(150, blush, tip(PORTRAIT_SCARF)),
      withCue(paint(420, PORTRAIT_SCARF), 'SCARF'),
      hop(160, tip(PORTRAIT_SCARF, true), tip(PORTRAIT_SIGNATURE)),
      withCue(paint(360, PORTRAIT_SIGNATURE), 'SIGNATURE'),
      leap(420, tip(PORTRAIT_SIGNATURE, true), HOME, 0.08),
      crouch(140, HOME),
      withEyes(stand(260, HOME, point(-0.4, -0.7)), 'wink'),
      crouch(150, HOME, 1.2),
      withEyes(withCue(leap(560, HOME, HOME, 0.22), 'TOSS'), 'smile'),
      withEyes(crouch(160, HOME, 1.1), 'smile'),
      withEyes(stand(420, HOME, lookUp), 'smile'),
    ],
  },
  interlude(
    withEyes(stroll(1150, HOME, strolledLeft, 3), 'smile'),
    idle(900, strolledLeft, [point(0.8, -0.6)]),
    withEyes(stroll(1150, strolledLeft, HOME, 3), 'smile'),
  ),
  {
    kind: 'BOUNCING',
    moves: [
      crouch(140, HOME),
      withEyes(leap(420, HOME, hopLeft, 0.28), 'smile'),
      crouch(130, hopLeft),
      withEyes(leap(680, hopLeft, hopRight, 0.85, 1), 'smile'),
      withEyes(crouch(170, hopRight, 1.2), 'dizzy'),
      wobble(360, hopRight),
      leap(360, hopRight, HOME, 0.2),
      crouch(120, HOME),
      withEyes(leap(240, HOME, HOME, 0.1), 'smile'),
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
      withEyes(crouch(180, HOME, 1.3), 'dizzy'),
      wobble(420, HOME),
      stand(280, HOME),
    ],
  },
  interlude(idle(1400, HOME, [point(0.8, 0), point(-0.8, 0), point(0, 0.8)])),
];

const choreography = createChoreography(ACTS);

export const COMPLETING_LOOP_MILLIS = choreography.loopMillis;
export const completingMoment = choreography.momentAt;
/**
 * 막의 길이를 반환한다. 소품이 막 끝에서 사라질 때 쓴다. 쉼 막에는 소품이 없다.
 *
 * @param kind 소품이 있는 막
 * @returns 막 길이(ms)
 */
export const completingActMillis = (
  kind: Exclude<CompletingAct, 'INTERLUDE'>,
) => choreography.actMillis(kind);
export const { cueStart, cueMillis, cueProgress } = choreography;

/**
 * 몇 번째 키를 누르는지와, 그 안에서 얼마나 진행했는지(0..1) 반환한다.
 *
 * @param inAct 막 안의 시각
 * @returns 타 번호와 그 타의 진행
 */
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

/**
 * 소품이 막 시작에 살짝 넘치며 나타나고 막 끝에 사라지는 정도다. 1 을 넘는 값은 등장 때의 넘침이다.
 * enterDelay 만큼 늦게 나타나 여러 소품이 차례로 튀어나온다.
 *
 * @param kind 소품이 있는 막
 * @param inAct 막 안의 시각
 * @param enterDelay 늦게 나타날 시간
 * @returns 나타난 정도
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
