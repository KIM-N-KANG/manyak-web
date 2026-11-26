'use client';

import { type CSSProperties, useEffect, useRef } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import { useRouter } from 'next/navigation';

import { hasInAppNavigation } from '@/components/providers/in-app-navigation-tracker';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/_shared/components/story-options-menu';

type StoryDetailHeaderProps = {
  storyId: string;
  title: string;
  /** 수정하기 노출 여부(회원이 만든 스토리만) */
  canEdit: boolean;
  /** 신고하기 노출 여부(회원만) */
  canReport: boolean;
  /** 삭제하기 노출 여부(내가 만든 스토리만) */
  canDelete: boolean;
  onDeleteSuccess: () => void;
  /** 본문 제목이 헤더 뒤로 스크롤돼 보이지 않는지. 참이면 헤더에 제목을 띄운다. */
  showTitle: boolean;
  /** 상단 표지가 썸네일 이미지인지. 참이면 흰 글자로 시작해 스크롤할수록 기본 전경색으로 섞는다. */
  hasHeroImage: boolean;
  /** 스크롤 위치를 읽을 본문 스크롤 컨테이너. 이 값이나 `heroElement`가 없으면 처음부터 불투명 헤더를 쓴다. */
  scrollContainerElement: HTMLElement | null;
  /** 상단 표지 영역. 표지 높이에서 헤더 높이를 뺀 만큼 스크롤하면 헤더 배경이 완전히 불투명해진다. */
  heroElement: HTMLElement | null;
};

/**
 * 스토리 상세 표지 위에 겹쳐 놓은 헤더.
 *
 * @remarks
 * 스크롤 위치에 따라 배경 알파와 글자색을 CSS 변수로 갱신해 스크롤마다 리렌더하지 않는다. 갱신은 프레임당 한 번으로
 * 모으고 헤더와 표지 크기가 바뀌어도 다시 계산한다. 앱 안 이동 이력이 없으면(공유 링크로 바로 진입) 뒤로가기를
 * 홈 탭 이동으로 대신한다.
 */
export function StoryDetailHeader({
  storyId,
  title,
  canEdit,
  canReport,
  canDelete,
  onDeleteSuccess,
  showTitle,
  hasHeroImage,
  scrollContainerElement,
  heroElement,
}: StoryDetailHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  // 공유 링크처럼 상세로 바로 들어오면 돌아갈 앱 화면이 없으므로 홈 탭으로 보낸다.
  const handleBack = () => {
    if (!hasInAppNavigation()) {
      router.replace(APP_PATH.MAIN.STORIES);

      return;
    }

    router.back();
  };

  useEffect(() => {
    const header = headerRef.current;
    const scrollContainer = scrollContainerElement;
    const hero = heroElement;

    if (!header || !scrollContainer || !hero) {
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
      // 썸네일이 없으면 밝은 기본 심벌 위라 처음부터 기본 전경색을 쓴다.
      header.style.setProperty(
        '--story-header-color',
        hasHeroImage
          ? `color-mix(in oklab, white ${imageColorWeight}%, var(--foreground))`
          : 'var(--foreground)',
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
  }, [hasHeroImage, heroElement, scrollContainerElement]);

  return (
    <header
      ref={headerRef}
      className="absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-2 px-1.5 text-[var(--story-header-color)]"
      style={
        {
          '--story-header-alpha': heroElement ? 0 : 1,
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
        onClick={handleBack}>
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

      <StoryOptionsMenu
        storyId={storyId}
        title={title}
        source="storyDetail"
        canEdit={canEdit}
        canReport={canReport}
        canDelete={canDelete}
        onDeleteSuccess={onDeleteSuccess}
        size="icon"
        triggerClassName="relative text-current hover:bg-black/10 hover:text-current aria-expanded:bg-black/10 aria-expanded:text-current"
      />
    </header>
  );
}
