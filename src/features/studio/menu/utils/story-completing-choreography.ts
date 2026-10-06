/**
 * 스토리 완성 중 표지에서 마스코트가 연기하는 안무다. 키워드를 고르고, 스토리라인을 고르고, 원고를 쓰고,
 * 그림을 그린 뒤 신나서 뛰어다니는 순서로 제작 과정을 따라가고, 바쁜 막 사이마다 쉰다.
 *
 * 좌표는 표지 폭을 1 로 둔 값이다(3:4 라 높이는 4/3). 시간 → 자세가 순수 함수라 그리는 쪽은 매 프레임 이
 * 값을 읽기만 한다. 막은 모두 바닥 가운데(`HOME`)에서 시작해 같은 자리로 돌아와, 막의 순서를 바꾸거나 막을
 * 빼도 이음매에서 마스코트가 순간이동하지 않는다. Android 와 같은 값을 쓴다.
 */

import {
  type Act,
  brush,
  createChoreography,
  crouch,
  cubic,
  easeOutBack,
  idle,
  leap,
  MASCOT_HEIGHT_RATIO,
  MASCOT_WIDTH_RATIO,
  type MascotPose,
  type Move,
  type Point,
  point,
  pose,
  stand,
  stretch,
  stroll,
  withCue,
} from '@/lib/mascot/mascot-choreography';

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

const PI = Math.PI;

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
      withCue(brush(820, STROKE_1, MASCOT_SIZE), 'STROKE_1'),
      leap(260, STROKE_1.end, STROKE_2.start, 0.05),
      withCue(brush(720, STROKE_2, MASCOT_SIZE), 'STROKE_2'),
      leap(400, STROKE_2.end, BLOOM_CENTER, 0.08),
      withCue(crouch(240, BLOOM_CENTER, 1.3), 'BLOOM'),
      leap(340, BLOOM_CENTER, SIGNATURE.start, 0.06),
      withCue(brush(380, SIGNATURE, MASCOT_SIZE), 'SIGNATURE'),
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
