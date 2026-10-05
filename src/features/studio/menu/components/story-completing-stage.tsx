'use client';

import { useEffect, useRef } from 'react';

import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';

import { useHoverCapable } from '@/lib/hooks/use-hover-capable';

import {
  drawStoryCompletingStage,
  type Rgb,
  type StagePalette,
} from '../utils/draw-story-completing-stage';
import type { Point } from '../utils/story-completing-choreography';

type StoryCompletingStageProps = {
  /** 스크린 리더가 읽는 진행 상태다. */
  label: string;
};

/**
 * 스토리 완성 중 표지. 로고 마스코트가 키워드를 고르고, 스토리라인을 고르고, 원고를 쓰고, 그림을 그린 뒤
 * 뛰어다니는 막을 사이사이 쉬어 가며 이어서 연기한다. 안무와 그리기는 utils 의 순수 함수가 맡고, 여기서는
 * 캔버스 크기·테마 색·프레임 루프만 다룬다.
 *
 * 마우스·트랙패드 환경에서는 마스코트가 표지 위의 포인터를 바라본다. 동작 줄이기에서는 바닥 가운데에 선
 * 마스코트 한 장면에서 멈춘다.
 */
export function StoryCompletingStage({ label }: StoryCompletingStageProps) {
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

      const millis = reduce ? 0 : performance.now() - (startedAt.current ?? 0);

      drawStoryCompletingStage(
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

    // 동작 줄이기에서는 루프가 없으므로 표지 크기가 바뀔 때만 다시 그린다.
    const observer = new ResizeObserver(() => {
      if (reduce) draw();
    });

    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduce, resolvedTheme]);

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
  };
}
