'use client';

import { useEffect, useState } from 'react';

type TypewriterOptions = {
  /** 한 글자 타이핑 간격(ms) */
  typingDelay?: number;
  /** 한 글자 삭제 간격(ms) */
  deletingDelay?: number;
  /** 문구 완성 후 멈추는 시간(ms) */
  pauseDelay?: number;
};

const DEFAULT_TYPING_DELAY = 90;
const DEFAULT_DELETING_DELAY = 50;
const DEFAULT_PAUSE_DELAY = 1200;

/**
 * 문구 목록을 타자기 효과로 순환하며 표시하는 훅.
 * 한 글자씩 타이핑한 뒤 잠시 멈추고, 다시 지운 후 다음 문구로 넘어간다.
 * @returns 현재까지 타이핑된 문자열
 */
export function useTypewriter(
  phrases: string[],
  options: TypewriterOptions = {},
): string {
  const typingDelay = options.typingDelay ?? DEFAULT_TYPING_DELAY;
  const deletingDelay = options.deletingDelay ?? DEFAULT_DELETING_DELAY;
  const pauseDelay = options.pauseDelay ?? DEFAULT_PAUSE_DELAY;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const phrase = phrases[phraseIndex] ?? '';

  useEffect(() => {
    if (phrases.length === 0) return;

    if (!isDeleting && charCount === phrase.length) {
      const timer = setTimeout(() => setIsDeleting(true), pauseDelay);

      return () => clearTimeout(timer);
    }

    if (isDeleting && charCount === 0) {
      const timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, deletingDelay);

      return () => clearTimeout(timer);
    }

    const timer = setTimeout(
      () => setCharCount((prev) => prev + (isDeleting ? -1 : 1)),
      isDeleting ? deletingDelay : typingDelay,
    );

    return () => clearTimeout(timer);
  }, [
    charCount,
    isDeleting,
    phrase.length,
    phrases.length,
    typingDelay,
    deletingDelay,
    pauseDelay,
  ]);

  return phrase.slice(0, charCount);
}
