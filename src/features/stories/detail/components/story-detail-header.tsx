'use client';

import { type CSSProperties, type RefObject, useEffect, useRef } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type StoryDetailHeaderProps = {
  title: string;
  showTitle: boolean;
  hasHeroImage: boolean;
  scrollContainerRef: RefObject<HTMLElement | null>;
  heroElement: HTMLElement | null;
};

export function StoryDetailHeader({
  title,
  showTitle,
  hasHeroImage,
  scrollContainerRef,
  heroElement,
}: StoryDetailHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const scrollContainer = scrollContainerRef.current;
    const hero = heroElement;

    if (!header || !scrollContainer || !hero || !hasHeroImage) {
      header?.style.setProperty('--story-header-alpha', '1');
      header?.style.setProperty('--story-header-color', 'var(--foreground)');

      return;
    }

    let animationFrame = 0;

    const updateHeader = () => {
      animationFrame = 0;

      const scrollRange = Math.max(hero.offsetHeight - header.offsetHeight, 1);
      const alpha = Math.min(
        Math.max(scrollContainer.scrollTop / scrollRange, 0),
        1,
      );
      const imageColorWeight = Math.round((1 - alpha) * 100);

      header.style.setProperty('--story-header-alpha', String(alpha));
      header.style.setProperty(
        '--story-header-color',
        `color-mix(in oklab, white ${imageColorWeight}%, var(--foreground))`,
      );
    };

    const requestUpdate = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateHeader);
      }
    };

    const resizeObserver = new ResizeObserver(requestUpdate);

    resizeObserver.observe(header);
    resizeObserver.observe(hero);
    scrollContainer.addEventListener('scroll', requestUpdate, {
      passive: true,
    });
    updateHeader();

    return () => {
      resizeObserver.disconnect();
      scrollContainer.removeEventListener('scroll', requestUpdate);

      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [hasHeroImage, heroElement, scrollContainerRef]);

  return (
    <header
      ref={headerRef}
      className="absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-2 px-2 text-[var(--story-header-color)]"
      style={
        {
          '--story-header-alpha': hasHeroImage ? 0 : 1,
          '--story-header-color': hasHeroImage ? 'white' : 'var(--foreground)',
        } as CSSProperties
      }>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-background opacity-[var(--story-header-alpha)]"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="이전 페이지로 돌아가기 버튼"
        className="relative text-current hover:bg-black/10 hover:text-current"
        onClick={() => router.back()}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>

      <m.span
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative min-w-0 flex-1 truncate font-semibold">
        {title}
      </m.span>
    </header>
  );
}
