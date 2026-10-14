'use client';

import Image from 'next/image';

import type { ArtStyleCatalogItem } from '@/api/generated/models';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ART_STYLE_SECTION_LABEL } from '../../constants';
import { useArtStyleCatalog } from '../../hooks/use-art-style-catalog';

const ART_STYLE_LABEL_ID = 'art-style-label';

/** 목록을 받기 전에 보이는 자리 표시 칸 수다. 3열 두 줄을 채운다. */
const SKELETON_COUNT = 6;

type ArtStyleSelectSectionProps = {
  value: string | null;
  disabled: boolean;
  onValueChange: (code: string) => void;
};

export function ArtStyleSelectSection({
  value,
  disabled,
  onValueChange,
}: ArtStyleSelectSectionProps) {
  const { artStyles, isPending, isError, refetch } = useArtStyleCatalog();

  return (
    <section
      aria-labelledby={ART_STYLE_LABEL_ID}
      className="flex flex-col gap-2 px-4">
      <FieldLabel id={ART_STYLE_LABEL_ID} className="gap-0.5">
        {ART_STYLE_SECTION_LABEL}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>

      {isError ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-foreground-secondary">
            이미지 스타일 목록을 불러오지 못했어요
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}>
            다시 시도하기
          </Button>
        </div>
      ) : isPending || !artStyles ? (
        <div aria-hidden="true" className="grid grid-cols-3 gap-2">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} className="aspect-3/4 rounded-lg" />
          ))}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={ART_STYLE_LABEL_ID}
          aria-required="true"
          className="grid grid-cols-3 gap-2">
          {artStyles.map((artStyle) => (
            <ArtStyleOption
              key={artStyle.code}
              artStyle={artStyle}
              checked={artStyle.code === value}
              disabled={disabled}
              onSelect={onValueChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type ArtStyleOptionProps = {
  artStyle: ArtStyleCatalogItem;
  checked: boolean;
  disabled: boolean;
  onSelect: (code: string) => void;
};

/**
 * 이미지 스타일 한 칸. 칸(label)의 relative는 sr-only 라디오의 위치 기준을 칸 안에 묶는다.
 * 없으면 기준이 스크롤 영역 밖 앱 프레임이 되어, 선택 시 포커스가 앱 프레임을 밀어 올린다.
 */
function ArtStyleOption({
  artStyle: { code = '', name, previewImageUrl },
  checked,
  disabled,
  onSelect,
}: ArtStyleOptionProps) {
  return (
    <label
      className={cn(
        'relative cursor-pointer rounded-lg ring-2 ring-transparent transition-shadow has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed',
        checked &&
          'ring-primary has-focus-visible:ring-2 has-focus-visible:ring-primary',
      )}>
      <input
        type="radio"
        name="art-style"
        value={code}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(code)}
        className="sr-only"
      />
      <AspectRatio
        ratio={3 / 4}
        className="overflow-hidden rounded-lg border border-border bg-muted">
        {previewImageUrl ? (
          <Image
            src={previewImageUrl}
            alt=""
            fill
            sizes="(max-width: 448px) calc(33vw - 16px), 140px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center">
            <ManyakSymbolIcon className="size-8 text-foreground-tertiary" />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-2 mx-auto w-fit max-w-[calc(100%-1rem)] truncate rounded-full bg-black/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md">
          {name}
        </span>
      </AspectRatio>
    </label>
  );
}
