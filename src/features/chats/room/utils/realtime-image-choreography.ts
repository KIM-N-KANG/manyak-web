/**
 * 채팅 실시간 이미지를 기다리는 동안 마스코트가 연기하는 안무다. 처음 한 번 화가 베레모를 쓰고 붓을 집어
 * 든 뒤, 힘을 모으고(아자아자), 붓으로 인물을 휘갈겨 그리고, 휴 하고 안도한 뒤, 수채로 다른 인물을 그리고,
 * 딴짓하다 번뜩여 검은 종이에 별자리 인물을 찍는다. 다 그린 그림은 빨랫줄에 걸리고, 응답이 늦으면 아자아자부터
 * 다시 그린다. 그림은 몸 오른쪽에 든 붓의 끝으로 긋는다.
 *
 * 좌표는 무대 폭을 1 로 둔 값이다(4:3 이라 높이는 3/4). 도화지 안의 그림은 도화지 폭을 84칸으로 둔 격자
 * 좌표로 적고, 붓길은 SVG path 문자열(M·L·Q·C 절대 좌표)로 적어 그리는 쪽과 마스코트가 같은 길을 쓴다.
 * Android 와 같은 값을 쓴다.
 */

import {
  type Act,
  brushTipOffset as brushTipOffsetFor,
  createChoreography,
  crouch,
  easeOutBack,
  idle,
  leap,
  MASCOT_HEIGHT_RATIO,
  MASCOT_WIDTH_RATIO,
  type Move,
  paintAlong,
  parseStroke,
  type Point,
  point,
  pose,
  stand,
  type Stroke,
  strokeAt,
  stroll,
  withCue,
  withEyes,
} from '@/lib/mascot/mascot-choreography';

export { parseStroke, type Stroke, strokeAt };

export type RealtimeImageAct =
  | 'GEAR_UP'
  | 'HYPE'
  | 'SKETCH'
  | 'RELIEF'
  | 'WATERCOLOR'
  | 'DAYDREAM'
  | 'CONSTELLATION'
  | 'RESET';

/** 소품이 마스코트의 동작에 맞춰 바뀌는 순간이다. */
export type RealtimeImageCue =
  | 'HAT'
  | 'BRUSH'
  | 'CHARGE'
  | 'PUMP_1'
  | 'PUMP_2'
  | 'CONTOUR'
  | 'HATCH'
  | 'LASH'
  | 'EXHALE'
  | 'HALO'
  | 'BOB'
  | 'FACE'
  | 'CHEEK'
  | 'SCARF'
  | 'PONDER'
  | 'IDEA'
  | 'FLIP'
  | StarCue
  | 'CONNECT';

// ---- 무대 ----

export const STAGE_HEIGHT = 3 / 4;
export const MASCOT_SIZE = 0.15;
export const FLOOR = STAGE_HEIGHT - 0.07;
export const MASCOT_HALF_WIDTH = (MASCOT_SIZE * MASCOT_WIDTH_RATIO) / 2;
export const MASCOT_HEIGHT = MASCOT_SIZE * MASCOT_HEIGHT_RATIO;

export const HOME = point(0.22, FLOOR);

/** 첫 그림을 마치고 뛰어내려 숨을 고르는 자리다. */
const RELIEF_SPOT = point(0.33, FLOOR);

/** 붓을 집기 전 바닥에 누운 붓의 쥔 자리(무대 좌표)다. 붓털이 오른쪽을 향한다. */
export const BRUSH_ON_FLOOR = point(0.33, FLOOR - 0.005);

/**
 * 붓털 끝이 발끝 가운데에서 얼마나 떨어져 있는지 반환한다.
 *
 * @param rotation 몸 회전(도)
 * @param scaleX 가로 찌그러짐
 * @param scaleY 세로 찌그러짐
 * @returns 발끝 가운데로부터의 거리(무대 폭 단위)
 */
export const brushTipOffset = (rotation = 0, scaleX = 1, scaleY = 1) =>
  brushTipOffsetFor(MASCOT_SIZE, rotation, scaleX, scaleY);

/** 이젤에 세운 3:4 도화지다. 격자 한 칸은 무대 폭의 0.005 다. */
export const PAPER_GRID = 84;
export const PAPER_WIDTH = 0.42;
export const PAPER = {
  left: 0.45,
  top: 0.07,
  right: 0.45 + PAPER_WIDTH,
  bottom: 0.07 + (PAPER_WIDTH * 4) / 3,
};

/**
 * 도화지 격자 좌표를 무대 좌표로 바꾼다.
 *
 * @param at 도화지 격자 좌표
 * @returns 무대 좌표
 */
export const onPaper = (at: Point): Point =>
  point(
    PAPER.left + (at.x / PAPER_GRID) * PAPER_WIDTH,
    PAPER.top + (at.y / PAPER_GRID) * PAPER_WIDTH,
  );

/** 다 그린 그림을 거는 빨랫줄이다. 가운데가 sag 만큼 처진다. */
export const CLOTHESLINE = { left: 0.04, right: 0.39, y: 0.115, sag: 0.03 };
/** 빨랫줄에 걸린 그림의 폭(무대 폭 단위)과 걸리는 자리·기울기다. */
export const HUNG_WIDTH = 0.07;
export const HANG_SLOTS = [
  { x: 0.115, tilt: -5 },
  { x: 0.215, tilt: 3 },
  { x: 0.315, tilt: -2 },
];

/**
 * 빨랫줄 위 x 자리의 높이를 반환한다.
 *
 * @param x 무대 폭 단위 가로 좌표
 * @returns 빨랫줄 높이
 */
export function clotheslineY(x: number): number {
  const t = (x - CLOTHESLINE.left) / (CLOTHESLINE.right - CLOTHESLINE.left);

  return CLOTHESLINE.y + 4 * CLOTHESLINE.sag * t * (1 - t);
}

/**
 * 붓길의 시작점이나 끝점을 무대 좌표로 반환한다.
 *
 * @param stroke 붓길
 * @param end 끝점이면 true
 * @returns 무대 좌표
 */
const tip = (stroke: Stroke, end = false) =>
  brushAt(strokeAt(stroke, end ? 1 : 0));

/**
 * 바로 선 마스코트의 붓털 끝이 도화지 격자 at 에 닿는 발끝 자리를 반환한다.
 *
 * @param at 도화지 격자 좌표
 * @returns 발끝 가운데 자리(무대 좌표)
 */
function brushAt(at: Point): Point {
  const target = onPaper(at);
  const offset = brushTipOffset();

  return point(target.x - offset.x, target.y - offset.y);
}

/** 첫 그림. 연필 한 줄로 어깨에서 목·턱·입술·코·이마를 지나 머리 뒤로 흘러내리는 긴 머리 옆얼굴이다. */
export const SKETCH_CONTOUR = parseStroke(
  'M70,96 Q60,82 48,78 L48,65.5 L52,64.5 Q58,62 56,57.5 Q58.5,55.5 56.5,53 Q58.5,51 56,48.5 L60,46 L54,35 Q55,28 50,22 C44,12 28,12 22,24 C16,38 20,52 15,64 C11,76 18,86 13,98',
);
/** 머리카락 한 가닥을 아래에서 위로 쓸어 올린 뒤, 머리카락 결을 지그재그로 휘갈긴다. */
export const SKETCH_HATCH = parseStroke(
  'M20,94 C24,84 18,74 21,64 C24,54 20,40 26,30 L34,24 L22,34 L35,30 L21,42 L34,39 L20,50 L31,48 L19,57',
);
/** 감은 눈의 속눈썹이다. */
export const SKETCH_LASH = parseStroke('M46,40 Q49.5,42.6 53,40.2');

/** 둘째 그림. 반대쪽을 보는 단발 인물의 머리 윤곽을 굵은 붓으로 한 번에 쓴다. */
export const WATERCOLOR_HALO = point(44, 46);
export const WATERCOLOR_BOB = parseStroke(
  'M32,62 C28,63 25,60 26,54 C19,36 26,19 44,19 C60,19 69,33 64,54 C65,60 62,63 58,62',
);
export const WATERCOLOR_FACE = parseStroke(
  'M31,33 Q30,40 26,45 L31,47 Q30,52 34,55 Q38,61 45,61 Q54,61 58,54',
);
export const WATERCOLOR_CHEEK = point(39, 49);
export const WATERCOLOR_SCARF = parseStroke('M27,71 C38,64 56,64 67,70');

/** 셋째 그림. 검은 종이에 별을 밟아 찍는 순서와 그 순간이다. 첫 별은 종이를 뒤집으며 내려앉는 자리다. */
export type StarCue =
  | 'STAR_B'
  | 'STAR_D'
  | 'STAR_G'
  | 'STAR_H'
  | 'STAR_I'
  | 'STAR_N'
  | 'STAR_M'
  | 'STAR_J'
  | 'STAR_K'
  | 'STAR_L';
export type Star = { at: Point; cue: StarCue | 'FLIP'; big: boolean };
export const STARS: Star[] = [
  { at: point(44, 18), cue: 'FLIP', big: true },
  { at: point(28, 27), cue: 'STAR_B', big: false },
  { at: point(19, 45), cue: 'STAR_D', big: true },
  { at: point(26, 61), cue: 'STAR_G', big: true },
  { at: point(33, 68), cue: 'STAR_H', big: false },
  { at: point(18, 90), cue: 'STAR_I', big: false },
  { at: point(66, 90), cue: 'STAR_N', big: false },
  { at: point(54, 64), cue: 'STAR_M', big: false },
  { at: point(62, 30), cue: 'STAR_J', big: false },
  { at: point(66, 42), cue: 'STAR_K', big: true },
  { at: point(76, 66), cue: 'STAR_L', big: true },
];
/** 별을 다 찍은 뒤 잇는 선이다. 옆얼굴, 머리 뒤, 포니테일 순서로 긋는다. */
export const CONSTELLATION_LINES = [
  parseStroke(
    'M44,18 Q32,18 28,27 Q26,31 27,36 L19,45 L25,47.5 Q22.5,50 24.5,52 Q22.5,54.5 25,56 Q24,59 26,61 Q29,65 33,68 L18,90',
  ),
  parseStroke('M44,18 Q56,19 62,30 Q65,35 66,42 Q62,55 54,64 L66,90'),
  parseStroke('M66,42 Q79,47 76,66'),
];
/** 별자리를 이을 때 깜빡 떠오르는 눈 별이다. */
export const CONSTELLATION_EYE = point(29, 39);

// ---- 낱동작 ----

const PI = Math.PI;

/**
 * 0..1 을 부드럽게 시작하고 멈추는 곡선으로 바꾼다.
 *
 * @param t 0..1 진행
 * @returns 0..1 곡선 값
 */
const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1);

  return c * c * (3 - 2 * c);
};

/**
 * 바닥에 깊게 웅크려 부르르 떨며 힘을 모았다가 풀린다. 눈은 `> <` 로 힘준다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const charge = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const hold = f < 0.25 ? smooth(f / 0.25) : 1 - smooth((f - 0.82) / 0.18);
    const shiver = Math.sin((2 * PI * f * millis) / 45) * 0.0035 * hold;

    return pose(at.x + shiver, at.y, {
      scaleX: 1 + 0.14 * hold,
      scaleY: 1 - 0.17 * hold,
      eyes: 'focus',
    });
  },
});

/**
 * 숨을 내쉬듯 천천히 납작해지며 웃는 눈으로 감는다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const exhale = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const sink = smooth(f / 0.7);

    return pose(at.x, at.y, {
      scaleX: 1 + 0.1 * sink,
      scaleY: 1 - 0.13 * sink,
      rotation: -3 * Math.sin(PI * f),
      look: point(-0.4, 0.2),
      eyes: 'smile',
    });
  },
});

/**
 * 납작해진 몸이 통 하고 원래대로 돌아온다. exhale 이 끝난 모양에서 시작한다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const perk = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const back = easeOutBack(f);

    return pose(at.x, at.y, {
      scaleX: 1.1 - 0.1 * back,
      scaleY: 0.87 + 0.13 * back,
      eyes: f < 0.5 ? 'smile' : 'round',
    });
  },
});

/**
 * 빨랫줄의 그림을 올려다보며 고개를 왼쪽, 오른쪽으로 갸웃거린다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const ponder = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) =>
    pose(at.x, at.y, {
      scaleY: 1 + 0.015 * Math.sin(4 * PI * f),
      rotation: -10 * Math.sin(2 * PI * f),
      look: point(-0.5 + 0.3 * Math.sin(2 * PI * f), -0.9),
    }),
});

/**
 * 도화지 붓길을 붓털 끝으로 따라 긋는다.
 *
 * @param millis 길이
 * @param stroke 도화지 격자 좌표 붓길
 * @param scribble 휘갈기기면 true
 * @returns 동작
 */
const trace = (millis: number, stroke: Stroke, scribble = false) =>
  paintAlong(millis, stroke, onPaper, MASCOT_SIZE, scribble);

/**
 * 붓길 사이를 짧게 건너뛴다.
 *
 * @param millis 길이
 * @param from 뛰는 자리(무대 좌표)
 * @param to 내려앉는 자리(무대 좌표)
 * @returns 동작
 */
const hop = (millis: number, from: Point, to: Point) =>
  leap(millis, from, to, 0.025);

// ---- 막 ----

const halo = brushAt(WATERCOLOR_HALO);
const cheek = brushAt(WATERCOLOR_CHEEK);
const starAt = STARS.map((star) => brushAt(star.at));
const lookAtPaper = point(0.8, -0.2);
const lookAtLine = point(-0.5, -0.9);

/**
 * 별을 차례로 밟아 찍는 짧은 점프들이다. 첫 별에서 시작해 마지막 별에 내려앉는다.
 *
 * @returns 동작 목록
 */
function starHops(): Move<RealtimeImageCue>[] {
  const millis = [140, 150, 150, 120, 150, 260, 140, 170, 120, 160];

  return STARS.slice(1).map((star, index) =>
    withCue(
      hop(millis[index], starAt[index], starAt[index + 1]),
      star.cue as StarCue,
    ),
  );
}

/** 처음 한 번만 연기하는 준비 막이다. 떨어지는 베레모를 머리로 받고, 발치의 붓을 뛰어올라 낚아챈다. */
const INTRO_ACTS: Act<RealtimeImageAct, RealtimeImageCue>[] = [
  {
    kind: 'GEAR_UP',
    moves: [
      withCue(stand(380, HOME, point(0, -1)), 'HAT'),
      withEyes(crouch(150, HOME, 1.1), 'smile'),
      stand(180, HOME, point(0.8, 0.8)),
      crouch(110, HOME, 1, point(0.8, 0.8)),
      withCue(leap(360, HOME, HOME, 0.07), 'BRUSH'),
      crouch(120, HOME),
    ],
  },
];

/** 붓을 낚아채는 순간이다. 점프의 이 비율에서 붓이 손에 들어온다. */
export const BRUSH_CATCH = 0.65;

const ACTS: Act<RealtimeImageAct, RealtimeImageCue>[] = [
  {
    kind: 'HYPE',
    moves: [
      withCue(charge(400, HOME), 'CHARGE'),
      withEyes(withCue(leap(260, HOME, HOME, 0.05), 'PUMP_1'), 'focus'),
      withEyes(crouch(110, HOME, 0.8), 'focus'),
      withEyes(withCue(leap(320, HOME, HOME, 0.09), 'PUMP_2'), 'focus'),
      withEyes(crouch(140, HOME, 1.1), 'focus'),
      stand(70, HOME, lookAtPaper),
    ],
  },
  {
    kind: 'SKETCH',
    moves: [
      stand(100, HOME, lookAtPaper),
      crouch(130, HOME),
      leap(360, HOME, tip(SKETCH_CONTOUR), 0.06),
      withCue(trace(1220, SKETCH_CONTOUR), 'CONTOUR'),
      hop(170, tip(SKETCH_CONTOUR, true), tip(SKETCH_HATCH)),
      withCue(trace(760, SKETCH_HATCH, true), 'HATCH'),
      hop(170, tip(SKETCH_HATCH, true), tip(SKETCH_LASH)),
      withCue(trace(190, SKETCH_LASH), 'LASH'),
      leap(400, tip(SKETCH_LASH, true), RELIEF_SPOT, 0.05),
    ],
  },
  {
    kind: 'RELIEF',
    moves: [
      crouch(150, RELIEF_SPOT, 1.1),
      withCue(exhale(650, RELIEF_SPOT), 'EXHALE'),
      perk(200, RELIEF_SPOT),
      stroll(350, RELIEF_SPOT, HOME, 2),
    ],
  },
  {
    kind: 'WATERCOLOR',
    moves: [
      crouch(100, HOME),
      leap(460, HOME, halo, 0.1, 1),
      withCue(crouch(240, halo, 1.2), 'HALO'),
      hop(150, halo, tip(WATERCOLOR_BOB)),
      withCue(trace(640, WATERCOLOR_BOB), 'BOB'),
      hop(170, tip(WATERCOLOR_BOB, true), tip(WATERCOLOR_FACE)),
      withCue(trace(420, WATERCOLOR_FACE), 'FACE'),
      hop(140, tip(WATERCOLOR_FACE, true), cheek),
      withCue(crouch(170, cheek, 0.9), 'CHEEK'),
      hop(150, cheek, tip(WATERCOLOR_SCARF)),
      withCue(trace(320, WATERCOLOR_SCARF), 'SCARF'),
      leap(420, tip(WATERCOLOR_SCARF, true), HOME, 0.08, -1),
      crouch(120, HOME),
    ],
  },
  {
    kind: 'DAYDREAM',
    moves: [
      withCue(ponder(760, HOME), 'PONDER'),
      stand(120, HOME, lookAtLine),
      withCue(leap(280, HOME, HOME, 0.07), 'IDEA'),
      crouch(140, HOME),
      stand(100, HOME, lookAtPaper),
    ],
  },
  {
    kind: 'CONSTELLATION',
    moves: [
      stand(70, HOME, lookAtPaper),
      crouch(100, HOME, 1.1),
      withCue(leap(520, HOME, starAt[0], 0.07, 1), 'FLIP'),
      ...starHops(),
      withCue(
        stand(400, starAt[starAt.length - 1], point(-0.6, 0.6)),
        'CONNECT',
      ),
      leap(420, starAt[starAt.length - 1], HOME, 0.06),
      crouch(130, HOME, 1.1),
    ],
  },
  {
    kind: 'RESET',
    moves: [withEyes(idle(1000, HOME, [lookAtLine]), 'smile')],
  },
];

const intro = createChoreography(INTRO_ACTS);
const loop = createChoreography(ACTS);
const INTRO_CUES = new Set<RealtimeImageCue>(['HAT', 'BRUSH']);

/** 준비 막의 길이다. 이 시간이 지나면 아자아자부터 한 바퀴를 반복한다. */
export const REALTIME_IMAGE_INTRO_MILLIS = intro.loopMillis;
export const REALTIME_IMAGE_LOOP_MILLIS = loop.loopMillis;

/**
 * 무대가 시작된 뒤의 시각에 마스코트가 어느 막에서 어떤 자세인지 반환한다. 준비 막은 처음 한 번만 연기한다.
 *
 * @param millis 무대가 시작된 뒤 흐른 시간
 * @returns 막·막 안의 시각·자세
 */
export function realtimeImageMoment(millis: number) {
  return millis < REALTIME_IMAGE_INTRO_MILLIS
    ? intro.momentAt(millis)
    : loop.momentAt(millis - REALTIME_IMAGE_INTRO_MILLIS);
}

/**
 * 반복하는 한 바퀴 안의 시각을 반환한다. 준비 막 동안에는 -1 이다.
 *
 * @param millis 무대가 시작된 뒤 흐른 시간
 * @returns 한 바퀴 안의 시각(ms)
 */
export function loopTime(millis: number): number {
  return millis < REALTIME_IMAGE_INTRO_MILLIS
    ? -1
    : (millis - REALTIME_IMAGE_INTRO_MILLIS) % REALTIME_IMAGE_LOOP_MILLIS;
}

/**
 * cue 가 속한 안무를 반환한다.
 *
 * @param cue 소품 신호
 * @returns 준비 막이나 반복하는 한 바퀴의 안무
 */
const owner = (cue: RealtimeImageCue) => (INTRO_CUES.has(cue) ? intro : loop);

/**
 * cue 동작이 막 안에서 시작하는 시각을 반환한다.
 *
 * @param cue 소품 신호
 * @returns 시작 시각(ms)
 */
export const cueStart = (cue: RealtimeImageCue) => owner(cue).cueStart(cue);

/**
 * cue 동작의 길이를 반환한다.
 *
 * @param cue 소품 신호
 * @returns 길이(ms)
 */
export const cueMillis = (cue: RealtimeImageCue) => owner(cue).cueMillis(cue);

/**
 * cue 동작이 막 안의 시각에 얼마나 진행했는지 반환한다.
 *
 * @param cue 소품 신호
 * @param inAct 막 안의 시각
 * @returns 0..1 진행
 */
export const cueProgress = (cue: RealtimeImageCue, inAct: number) =>
  owner(cue).cueProgress(cue, inAct);

/**
 * 반복하는 막이 한 바퀴 안에서 시작하는 시각을 반환한다.
 *
 * @param kind 반복하는 막
 * @returns 시작 시각(ms)
 */
export function actStart(kind: Exclude<RealtimeImageAct, 'GEAR_UP'>): number {
  let start = 0;

  for (const act of ACTS) {
    if (act.kind === kind) return start;

    start += loop.actMillis(act.kind);
  }

  return start;
}

/** 동작 줄이기에서 멈춰 보일 장면이다. 크로키를 마치고 도화지 옆에 내려선 순간이다. */
export const REALTIME_IMAGE_STILL_MILLIS =
  REALTIME_IMAGE_INTRO_MILLIS + actStart('RELIEF') + 150;
