/**
 * 채팅 실시간 이미지를 기다리는 동안 마스코트가 연기하는 안무다. 처음 한 번 화가 베레모를 쓰고 붓을 집어 든 뒤,
 * 4:3 가로 도화지에 밤 창가에서 달을 보는 인물 한 장을 밑그림, 밑칠, 인물, 마무리 순서로 천천히 그린다. 획은
 * 적게, 붓끝은 느리게 움직여 대화 화면에서 정신없지 않게 한다. 밑그림을 마치면 휴 하고 숨을 고르고, 인물을
 * 마치면 그림을 올려다보며 딴짓하다 번뜩이며, 물감 색을 바꿀 때마다 물그릇에 붓을 헹군다. 무대 시작부터 15초에
 * 사인을 마치고, 완성 그림을 감상한 뒤 종이를 넘겨 밑그림부터 같은 그림을 다시 그린다.
 *
 * 그림은 몸 오른쪽에 든 붓의 털 끝으로 긋는다. 붓은 몸에 고정되지 않고, 그을 때는 털 끝이 진행 반대쪽으로
 * 끌리고, 밑칠에서는 털이 눌려 퍼지고, 획을 마치면 톡 튕기고, 쉬는 막에서는 치켜들거나 돌린다.
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
  type PaintOptions,
  parseStroke,
  type Point,
  point,
  pose,
  stand,
  type Stroke,
  strokeAt,
  withCue,
  withEyes,
} from '@/lib/mascot/mascot-choreography';

export { parseStroke, type Stroke, strokeAt };

export type RealtimeImageAct =
  | 'GEAR_UP'
  | 'SKETCH'
  | 'RELIEF'
  | 'WASH'
  | 'FIGURE'
  | 'DAYDREAM'
  | 'FINISH'
  | 'SHOWCASE'
  | 'PAGE_TURN';

type LoopAct = Exclude<RealtimeImageAct, 'GEAR_UP'>;

/** 소품과 그림이 마스코트의 동작에 맞춰 바뀌는 순간이다. 그림 cue 는 그 획을 긋는 동작에 붙는다. */
export type RealtimeImageCue =
  | 'HAT'
  | 'BRUSH'
  | 'WINDOW'
  | 'MULLION_V'
  | 'MULLION_H'
  | 'OUTLINE'
  | 'EXHALE'
  | 'RINSE_1'
  | 'NIGHT'
  | 'HAIR'
  | 'FACE'
  | 'EYE'
  | 'PONDER'
  | 'IDEA'
  | 'RINSE_2'
  | 'BEAM'
  | 'CHEEK'
  | 'SIGN'
  | 'SHOWCASE'
  | 'TURN'
  | 'RINSE_3';

// ---- 무대 ----

export const STAGE_HEIGHT = 3 / 4;
export const MASCOT_SIZE = 0.15;
export const FLOOR = STAGE_HEIGHT - 0.07;
export const MASCOT_HALF_WIDTH = (MASCOT_SIZE * MASCOT_WIDTH_RATIO) / 2;
export const MASCOT_HEIGHT = MASCOT_SIZE * MASCOT_HEIGHT_RATIO;

export const HOME = point(0.2, FLOOR);

/** 붓을 집기 전 바닥에 누운 붓의 쥔 자리(무대 좌표)다. 붓털이 오른쪽을 향한다. */
export const BRUSH_ON_FLOOR = point(0.33, FLOOR - 0.005);

/**
 * 붓털 끝이 발끝 가운데에서 얼마나 떨어져 있는지 반환한다.
 *
 * @param rotation 몸 회전(도)
 * @param scaleX 가로 찌그러짐
 * @param scaleY 세로 찌그러짐
 * @param brush 몸 기준 붓 회전(도)
 * @returns 발끝 가운데로부터의 거리(무대 폭 단위)
 */
export const brushTipOffset = (
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  brush = 0,
) => brushTipOffsetFor(MASCOT_SIZE, rotation, scaleX, scaleY, brush);

/** 이젤에 세운 4:3 가로 도화지다. 격자는 폭 84칸, 높이 63칸이다. */
export const PAPER_GRID = 84;
export const GRID_HEIGHT = 63;
export const PAPER_WIDTH = 0.54;
export const PAPER = {
  left: 0.38,
  top: 0.1,
  right: 0.38 + PAPER_WIDTH,
  bottom: 0.1 + (PAPER_WIDTH * GRID_HEIGHT) / PAPER_GRID,
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

/**
 * 붓길의 시작점이나 끝점을 그리는 발끝 자리로 반환한다.
 *
 * @param stroke 붓길
 * @param end 끝점이면 true
 * @returns 무대 좌표
 */
const tip = (stroke: Stroke, end = false) =>
  brushAt(strokeAt(stroke, end ? 1 : 0));

// ---- 그림 ----

/** 밑그림. 창턱을 긋고 오른쪽 창틀을 올라 아치를 넘어 왼쪽 창틀로 내려온다. */
export const WINDOW = parseStroke(
  'M4,54 L47,54 L47,26 C47,15 38,9 28,9 C18,9 9,15 9,26 L9,54',
);
/** 창살 십자다. */
export const MULLION_V = parseStroke('M28,10 L28,53');
export const MULLION_H = parseStroke('M10,32 L46,32');
/**
 * 창 쪽 어깨에서 턱 밑을 지나 얼굴 앞선을 타고 이마, 정수리, 뒤통수, 목덜미를 거쳐 등 쪽 어깨로 흐르는 인물
 * 윤곽이다. 동그란 머리와 대칭 어깨로 그리면 사람 아이콘처럼 보여 옆모습의 비대칭 선으로 잡는다.
 */
export const OUTLINE = parseStroke(
  'M53,63 C54,53 59,46 63,44 C61,40 58,36 58,30 C58,21 63,16 68,16 C74,16 76,22 75,28 C74,34 70,38 71,41 C77,44 80,52 81,63',
);

/** 밑칠. 창틀 안쪽이다. 밤은 이 안에만 칠한다. */
export const PANE =
  'M10,53 L10,26 C10,16 18,10 28,10 C38,10 46,16 46,26 L46,53 Z';
/** 칠하지 않고 남겨 둔 달과, 그 위를 밤 색으로 덮어 초승달로 만드는 원이다. */
export const MOON = { at: point(20, 21), radius: 4.2 };
export const MOON_SHADOW = { at: point(22.2, 19.6), radius: 3.6 };
/** 창 안을 위에서 아래로 넓은 붓으로 세 번 쓸어 내리는 지그재그다. */
export const NIGHT = parseStroke('M15,17 L41,14 L11,30 L45,28 L11,46 L45,45');

/** 인물. 이마에서 정수리를 넘어 등 뒤로 흘러내리는 머리카락이다. */
export const HAIR = parseStroke(
  'M59,20 C61,14 71,13 74,19 C77,25 74,33 77,40 C79,46 77,50 80,54',
);
/** 창 쪽을 보는 옆얼굴의 이마, 코, 입술, 턱이다. */
export const FACE = parseStroke(
  'M59.5,21 Q57,24.5 58,27.5 L55.5,29.5 Q57.5,30.5 57.5,31.5 Q57,33 58.5,33.5 Q59.5,37 63.5,38.5',
);
/** 감은 눈이다. */
export const EYE = parseStroke('M59.2,25.8 Q60.8,27 62.4,26');

/** 마무리. 창 위쪽에서 인물 쪽으로 쏟아지는 달빛의 가운데 줄과 가장자리다. */
export const BEAM = parseStroke('M40,13 L69,63');
export const BEAM_EDGES = {
  top: [point(36, 13), point(44, 13)],
  bottom: [point(56, 63), point(82, 63)],
};
export const CHEEK_AT = point(61, 31);
/** 오른쪽 아래 사인이다. */
export const SIGN = parseStroke(
  'M71,59.5 Q72.5,56.5 74,59 Q75.5,61 77,58.5 L79,59.8',
);

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
 * 동작의 붓 회전만 바꾼다.
 *
 * @param move 동작
 * @param brush 진행 → 몸 기준 붓 회전(도)
 * @returns 붓 회전을 바꾼 동작
 */
const withBrush = <C extends string>(
  move: Move<C>,
  brush: (f: number) => number,
): Move<C> => ({
  ...move,
  pose: (f) => ({ ...move.pose(f), brush: brush(f) }),
});

/**
 * 획을 마치고 붓을 뗄 때 털 끝이 위로 톡 튀었다가 스프링처럼 제자리로 돌아오는 붓 회전이다.
 *
 * @param amount 가장 크게 튀는 각도(도)
 * @returns 진행 → 붓 회전
 */
const flick = (amount: number) => (f: number) =>
  -amount * Math.exp(-5 * f) * Math.sin(3 * PI * f);

/**
 * 숨을 내쉬듯 천천히 납작해지며 웃는 눈으로 감는다. 그동안 붓은 어깨에 기대듯 위로 세웠다가 내린다.
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
      brush: -140 * smooth(f / 0.3) * (1 - smooth((f - 0.7) / 0.3)),
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
 * 도화지를 올려다보며 고개를 왼쪽, 오른쪽으로 갸웃거린다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const ponder = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const sway = Math.sin(2 * PI * f);

    // 물그릇 쪽(오른쪽)으로는 얕게 기울여 붓털이 물그릇에 닿지 않게 한다.
    return pose(at.x, at.y, {
      scaleY: 1 + 0.015 * Math.sin(4 * PI * f),
      rotation: sway > 0 ? -8 * sway : -3 * sway,
      look: point(0.6 + 0.3 * sway, -0.9),
    });
  },
});

/** 헹굴 때 붓을 기울이는 각도와 몸이 찌그러지는 정도다. 붓털 끝이 발치 물그릇에 잠긴다. */
const RINSE_BRUSH = 60;
const RINSE_SCALE_X = 1.08;
const RINSE_SCALE_Y = 0.9;

/**
 * 집 자리에서 몸을 낮추며 붓털 끝을 발치 물그릇에 담그고 좌우로 두 번 흔든 뒤 든다.
 *
 * @param millis 길이
 * @returns 동작
 */
const rinse = (millis: number): Move => ({
  millis,
  pose: (f) => {
    const dip = Math.sin(PI * f);
    const swish = Math.sin(4 * PI * f) * dip;

    return pose(HOME.x, HOME.y, {
      scaleX: 1 + (RINSE_SCALE_X - 1) * dip,
      scaleY: 1 - (1 - RINSE_SCALE_Y) * dip,
      look: point(0.9, 0.9),
      brush: RINSE_BRUSH * dip + 6 * swish,
    });
  },
});

const RINSE_TIP = brushTipOffset(0, RINSE_SCALE_X, RINSE_SCALE_Y, RINSE_BRUSH);

/** 집 자리 발치의 물그릇이다. 헹굴 때 붓털 끝이 닿는 자리를 가운데로 두고, rim 아래가 물이다. */
export const BOWL = {
  x: HOME.x + RINSE_TIP.x,
  halfWidth: 0.024,
  rim: FLOOR - 0.017,
};

/**
 * 도화지 붓길을 붓털 끝으로 따라 긋는다.
 *
 * @param millis 길이
 * @param stroke 도화지 격자 좌표 붓길
 * @param options 붓질 선택 값
 * @returns 동작
 */
const trace = (millis: number, stroke: Stroke, options: PaintOptions) =>
  paintAlong(millis, stroke, onPaper, MASCOT_SIZE, options);

/** 연필처럼 가는 선, 넓게 눌러 칠하는 밑칠, 굵은 붓결이다. 천천히 그어 끌림도 얕게 둔다. */
const PENCIL: PaintOptions = { lean: 14 };
const WASH: PaintOptions = { lean: 20, press: 1 };
const BRUSHY: PaintOptions = { lean: 18, press: 0.7 };

/**
 * 붓길 사이를 짧게 건너뛰며 뗀 붓을 톡 튕긴다.
 *
 * @param millis 길이
 * @param from 뛰는 자리(무대 좌표)
 * @param to 내려앉는 자리(무대 좌표)
 * @returns 동작
 */
const hop = (millis: number, from: Point, to: Point) =>
  withBrush(leap(millis, from, to, 0.02), flick(16));

/**
 * 붓털 끝으로 도화지를 콕 찍는다. 몸을 낮추는 동안 붓털이 눌린다.
 *
 * @param millis 길이
 * @param at 발끝 자리(무대 좌표)
 * @returns 동작
 */
const dab = (millis: number, at: Point): Move => {
  const move = crouch(millis, at, 0.9, point(0.7, 0.6));

  return {
    millis,
    pose: (f) => ({ ...move.pose(f), press: Math.sin(PI * f) }),
  };
};

/**
 * 완성한 그림을 반짝이는 눈으로 올려다보며 붓을 높이 들었다 내린다.
 *
 * @param millis 길이
 * @param at 서 있는 자리
 * @returns 동작
 */
const admire = (millis: number, at: Point): Move => ({
  millis,
  pose: (f) => {
    const lift = Math.sin(PI * f);

    return pose(at.x, at.y, {
      scaleX: 1 - 0.04 * lift,
      scaleY: 1 + 0.06 * lift,
      look: point(0.7, -0.8),
      eyes: 'sparkle',
      brush: -150 * smooth(f / 0.3) * (1 - smooth((f - 0.75) / 0.25)),
    });
  },
});

// ---- 막 ----

const cheek = brushAt(CHEEK_AT);
const lookAtPaper = point(0.8, -0.2);

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

const ACTS: Act<LoopAct, RealtimeImageCue>[] = [
  {
    kind: 'SKETCH',
    moves: [
      stand(100, HOME, lookAtPaper),
      crouch(140, HOME),
      leap(420, HOME, tip(WINDOW), 0.045),
      withCue(trace(1100, WINDOW, PENCIL), 'WINDOW'),
      hop(260, tip(WINDOW, true), tip(MULLION_V)),
      withCue(trace(340, MULLION_V, PENCIL), 'MULLION_V'),
      hop(240, tip(MULLION_V, true), tip(MULLION_H)),
      withCue(trace(300, MULLION_H, PENCIL), 'MULLION_H'),
      hop(280, tip(MULLION_H, true), tip(OUTLINE)),
      withCue(trace(720, OUTLINE, PENCIL), 'OUTLINE'),
      withBrush(leap(420, tip(OUTLINE, true), HOME, 0.04), flick(24)),
    ],
  },
  {
    kind: 'RELIEF',
    moves: [
      crouch(150, HOME, 1.1),
      withCue(exhale(560, HOME), 'EXHALE'),
      perk(200, HOME),
      withCue(rinse(460), 'RINSE_1'),
    ],
  },
  {
    kind: 'WASH',
    moves: [
      crouch(120, HOME),
      leap(440, HOME, tip(NIGHT), 0.06),
      withCue(trace(1140, NIGHT, WASH), 'NIGHT'),
    ],
  },
  {
    kind: 'FIGURE',
    moves: [
      hop(320, tip(NIGHT, true), tip(HAIR)),
      withCue(trace(480, HAIR, BRUSHY), 'HAIR'),
      hop(260, tip(HAIR, true), tip(FACE)),
      withCue(trace(330, FACE, { lean: 8 }), 'FACE'),
      hop(220, tip(FACE, true), tip(EYE)),
      withCue(trace(220, EYE, { lean: 6 }), 'EYE'),
      withBrush(leap(440, tip(EYE, true), HOME, 0.05), flick(24)),
      crouch(130, HOME),
    ],
  },
  {
    kind: 'DAYDREAM',
    moves: [
      withCue(ponder(640, HOME), 'PONDER'),
      stand(90, HOME, lookAtPaper),
      // 번뜩여 뛰어오르며 붓을 손끝에서 한 바퀴 돌린다.
      withCue(
        withBrush(leap(320, HOME, HOME, 0.06), (f) => -360 * smooth(f)),
        'IDEA',
      ),
      crouch(130, HOME),
      withCue(rinse(460), 'RINSE_2'),
    ],
  },
  {
    kind: 'FINISH',
    moves: [
      crouch(110, HOME, 1.1),
      leap(440, HOME, tip(BEAM), 0.05),
      withCue(trace(560, BEAM, WASH), 'BEAM'),
      hop(280, tip(BEAM, true), cheek),
      withCue(dab(220, cheek), 'CHEEK'),
      hop(280, cheek, tip(SIGN)),
      withCue(trace(380, SIGN, { lean: 12 }), 'SIGN'),
    ],
  },
  {
    kind: 'SHOWCASE',
    moves: [
      withBrush(leap(460, tip(SIGN, true), HOME, 0.06), flick(30)),
      crouch(150, HOME, 1.1),
      withCue(admire(900, HOME), 'SHOWCASE'),
    ],
  },
  {
    kind: 'PAGE_TURN',
    moves: [
      withCue(idle(760, HOME, [point(0.7, -0.9)]), 'TURN'),
      withCue(rinse(460), 'RINSE_3'),
    ],
  },
];

const intro = createChoreography(INTRO_ACTS);
const loop = createChoreography(ACTS);
const INTRO_CUES = new Set<RealtimeImageCue>(['HAT', 'BRUSH']);
const ORDER = ACTS.map((act) => act.kind);
const CUE_ACT = new Map<RealtimeImageCue, LoopAct>(
  ACTS.flatMap((act) =>
    act.moves.flatMap((move) =>
      move.cue ? [[move.cue, act.kind] as const] : [],
    ),
  ),
);

/** 준비 막의 길이다. 이 시간이 지나면 밑그림부터 한 바퀴를 반복한다. */
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
export function actStart(kind: LoopAct): number {
  let start = 0;

  for (const act of ACTS) {
    if (act.kind === kind) return start;

    start += loop.actMillis(act.kind);
  }

  return start;
}

/**
 * 그림 cue 의 획이 지금 얼마나 그려졌는지 알 수 있도록, 그 동작이 시작된 뒤 흐른 시간을 반환한다. 지난 막의
 * 획은 다 그린 것으로 보고, 아직 오지 않은 막과 준비 막에서는 시작 전으로 본다. 한 장의 그림이 여러 막에
 * 걸쳐 쌓이게 한다.
 *
 * @param cue 반복하는 막의 소품 신호
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @returns 흐른 시간(ms). 다 그렸으면 Infinity, 시작 전이면 -Infinity
 */
export function paintedFor(
  cue: RealtimeImageCue,
  act: RealtimeImageAct,
  actMillis: number,
): number {
  const at = ORDER.indexOf(CUE_ACT.get(cue)!);
  const now = act === 'GEAR_UP' ? -1 : ORDER.indexOf(act);

  if (at < now) return Number.POSITIVE_INFINITY;

  if (at > now) return Number.NEGATIVE_INFINITY;

  return actMillis - loop.cueStart(cue);
}

export type PaintColor = 'PENCIL' | 'GRAY' | 'GREEN';

/** 막마다 붓에 묻은 물감과, 그 막에서 헹군 뒤 바뀌는 물감이다. */
const PAINT_BY_ACT: Record<
  RealtimeImageAct,
  [PaintColor] | [PaintColor, RealtimeImageCue, PaintColor]
> = {
  GEAR_UP: ['PENCIL'],
  SKETCH: ['PENCIL'],
  RELIEF: ['PENCIL', 'RINSE_1', 'GRAY'],
  WASH: ['GRAY'],
  FIGURE: ['GRAY'],
  DAYDREAM: ['GRAY', 'RINSE_2', 'GREEN'],
  FINISH: ['GREEN'],
  SHOWCASE: ['GREEN'],
  PAGE_TURN: ['GREEN', 'RINSE_3', 'PENCIL'],
};

/**
 * 붓털에 묻은 물감을 반환한다. 헹구는 동작의 한가운데를 지나면 다음 층의 물감으로 바뀐다.
 *
 * @param act 지금 막
 * @param actMillis 막 안의 시각
 * @returns 붓털 물감
 */
export function paintColorAt(
  act: RealtimeImageAct,
  actMillis: number,
): PaintColor {
  const [before, rinseCue, after] = PAINT_BY_ACT[act];

  if (!rinseCue || !after) return before;

  return actMillis >= loop.cueStart(rinseCue) + loop.cueMillis(rinseCue) / 2
    ? after
    : before;
}

/** 무대 시작부터 사인을 마치는 시각이다. */
export const REALTIME_IMAGE_FINISH_MILLIS =
  REALTIME_IMAGE_INTRO_MILLIS +
  actStart('FINISH') +
  cueStart('SIGN') +
  cueMillis('SIGN');

/** 동작 줄이기에서 멈춰 보일 장면이다. 완성한 그림을 반짝이는 눈으로 올려다보는 순간이다. */
export const REALTIME_IMAGE_STILL_MILLIS =
  REALTIME_IMAGE_INTRO_MILLIS +
  actStart('SHOWCASE') +
  cueStart('SHOWCASE') +
  cueMillis('SHOWCASE') * 0.5;
