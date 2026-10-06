import { useEffect, useRef } from 'react';

import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';

import { useHoverCapable } from '@/lib/hooks/use-hover-capable';
import type { Rgb, StagePalette } from '@/lib/mascot/draw-mascot';
import type { Point } from '@/lib/mascot/mascot-choreography';

/** 무대 한 프레임을 그리는 함수다. 크기·시간·색·포인터를 받아 그리기만 한다. */
export type MascotStageDraw = (
  ctx: CanvasRenderingContext2D,
  layer: CanvasRenderingContext2D,
  width: number,
  height: number,
  millis: number,
  palette: StagePalette,
  lookAt: Point | null,
) => void;

type MascotStageProps = {
  /** 스크린 리더가 읽는 진행 상태다. */
  label: string;
  /**
   * 무대를 그리는 함수다. 모듈 수준 함수를 넘겨 프레임 루프가 다시 시작되지 않게 한다. 안무 시각은 무대가
   * 처음 그려진 순간부터 세고, 마우스·트랙패드 환경에서는 포인터 자리를 함께 넘긴다.
   */
  draw: MascotStageDraw;
  /** 동작 줄이기에서 멈춰 보일 안무 시각이다. 이때는 무대 크기가 바뀔 때만 다시 그린다. */
  stillMillis?: number;
};

export function MascotStage({
  label,
  draw: drawStage,
  stillMillis = 0,
}: MascotStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAt = useRef<number | null>(null);
  const lookAt = useRef<Point | null>(null);
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const layer = document.createElement('canvas').getContext('2d');

    if (!canvas || !ctx || !layer) return;

    const palette = readPalette(canvas);

    startedAt.current ??= performance.now();

    let frame = 0;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = layer.canvas.width = pixelWidth;
        canvas.height = layer.canvas.height = pixelHeight;
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      layer.setTransform(ratio, 0, 0, ratio, 0, 0);

      const millis = reduce
        ? stillMillis
        : performance.now() - (startedAt.current ?? 0);

      drawStage(
        ctx,
        layer,
        width,
        height,
        millis,
        palette,
        reduce ? null : lookAt.current,
      );

      if (!reduce) frame = requestAnimationFrame(draw);
    };

    draw();

    const observer = new ResizeObserver(() => {
      if (reduce) draw();
    });

    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [drawStage, reduce, resolvedTheme, stillMillis]);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canHover) return;

    const rect = event.currentTarget.getBoundingClientRect();

    lookAt.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.width,
    };
  };

  return (
    <div aria-busy className="size-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="block size-full"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          lookAt.current = null;
        }}
      />
    </div>
  );
}

/**
 * 테마 토큰을 캔버스가 섞을 수 있는 sRGB 값으로 읽는다. 토큰은 oklch 라 문자열로는 섞을 수 없어,
 * 한 점짜리 캔버스에 칠한 뒤 화소를 읽는다.
 *
 * @param element 토큰을 읽을 요소
 * @returns 무대 색
 */
function readPalette(element: HTMLElement): StagePalette {
  const style = getComputedStyle(element);
  const probe = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true });
  const read = (name: string): Rgb => {
    if (!probe) return [128, 128, 128];

    probe.canvas.width = probe.canvas.height = 1;
    probe.fillStyle = '#000';
    probe.fillStyle = style.getPropertyValue(name).trim();
    probe.fillRect(0, 0, 1, 1);

    const [red, green, blue] = probe.getImageData(0, 0, 1, 1).data;

    return [red, green, blue];
  };

  return {
    brand: read('--primary'),
    paper: read('--card'),
    ink: read('--foreground-tertiary'),
    key: read('--border'),
    pencil: read('--foreground-secondary'),
  };
}
