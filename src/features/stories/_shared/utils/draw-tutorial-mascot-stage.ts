import { drawMascot, type StagePalette } from '@/lib/mascot/draw-mascot';
import {
  blinkOpenness,
  createChoreography,
  type MascotEyes,
  type Move,
  type Point,
  point,
  pose,
  stand,
} from '@/lib/mascot/mascot-choreography';

/**
 * 간편 제작 첫 진입 안내 대화창의 둥근 프로필에서 마스코트가 말하는 안무다. 좌표는 정사각형 무대 폭을 1 로
 * 둔 값이고, 통통 튀어도 몸이 원 밖으로 잘리지 않는 크기와 자리에 둔다.
 */

const PI = Math.PI;

/** 무대 폭 대비 마스코트 크기다. 둥근 프로필 모서리에 몸이 잘리지 않는 크기다. */
export const TUTORIAL_MASCOT_SIZE = 0.66;

export const TUTORIAL_MASCOT_HOME = point(0.5, 0.86);

/** 말하는 동안 몸이 뜨는 최대 높이(무대 폭 단위)다. */
export const TUTORIAL_MASCOT_HOP = 0.035;

/**
 * 음절마다 살짝 떠올라 몸이 늘어나고 좌우로 기울며 말한다. 처음과 끝은 가만히 서 있어 앞뒤 동작과 이어진다.
 *
 * @param millis 길이
 * @param syllables 음절 수
 * @param eyes 말하는 동안의 눈 모양
 * @returns 동작
 */
const talk = (millis: number, syllables: number, eyes: MascotEyes): Move => ({
  millis,
  pose: (f) => {
    const settle = Math.sin(PI * f);
    const beat = Math.abs(Math.sin(PI * f * syllables)) * settle;

    return pose(
      TUTORIAL_MASCOT_HOME.x,
      TUTORIAL_MASCOT_HOME.y - TUTORIAL_MASCOT_HOP * beat,
      {
        scaleX: 1 - 0.03 * beat,
        scaleY: 1 + 0.04 * beat,
        rotation: 3 * Math.sin((PI * f * syllables) / 2) * settle,
        look: point(0.2, 0.3),
        eyes,
      },
    );
  },
});

const choreography = createChoreography([
  {
    kind: 'TALK',
    moves: [
      talk(1800, 7, 'round'),
      stand(900, TUTORIAL_MASCOT_HOME),
      talk(1500, 6, 'smile'),
      stand(800, TUTORIAL_MASCOT_HOME),
    ],
  },
]);

/**
 * 시각의 마스코트 자세를 반환한다.
 *
 * @param millis 안무 시작부터 흐른 시간
 * @returns 마스코트 자세
 */
export const tutorialMascotPose = (millis: number) =>
  choreography.momentAt(millis).pose;

/**
 * 말하는 마스코트를 그린다. 바탕 점과 그림자 없이 마스코트만 그린다.
 *
 * @param ctx 캔버스
 * @param _layer 소품 캔버스(쓰지 않음)
 * @param width 무대 폭
 * @param height 무대 높이
 * @param millis 안무 시작부터 흐른 시간
 * @param palette 테마 색
 * @param lookAt 포인터 자리
 */
export function drawTutorialMascotStage(
  ctx: CanvasRenderingContext2D,
  _layer: CanvasRenderingContext2D,
  width: number,
  height: number,
  millis: number,
  palette: StagePalette,
  lookAt: Point | null,
) {
  ctx.clearRect(0, 0, width, height);
  drawMascot(
    ctx,
    tutorialMascotPose(millis),
    width,
    TUTORIAL_MASCOT_SIZE,
    palette.brand,
    blinkOpenness(millis),
    lookAt,
  );
}
