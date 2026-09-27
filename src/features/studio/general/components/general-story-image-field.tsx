import { ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import type { ImagePresignRequestKind } from '@/api/generated/models';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { GENERAL_STORY_COVER_COPY } from '@/features/studio/general/constants';
import {
  type DraftImage,
  useDraftImagePicker,
} from '@/features/studio/general/hooks/use-draft-image-picker';
import { cn } from '@/lib/utils';

type GeneralStoryImageFieldProps = {
  id: string;
  label: string;
  kind: ImagePresignRequestKind;
  /** 미리보기 비율(가로/세로)이다. */
  ratio: number;
  /** 미리보기 폭 클래스다. */
  widthClassName: string;
  description: string;
  /** 같은 화면에 여러 개가 있을 때 버튼을 구분하는 접근 가능한 이름 앞머리다. */
  ariaLabelPrefix?: string;
  image: DraftImage | null;
  onChange: (image: DraftImage | null) => void;
};

export function GeneralStoryImageField({
  id,
  label,
  kind,
  ratio,
  widthClassName,
  description,
  ariaLabelPrefix,
  image,
  onChange,
}: GeneralStoryImageFieldProps) {
  const { isUploading, previewUrl, open, remove, inputProps } =
    useDraftImagePicker({ kind, image, onChange });
  const { upload, remove: removeLabel, fileRule } = GENERAL_STORY_COVER_COPY;

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled={isUploading}
          onClick={open}
          className={cn('shrink-0 rounded-lg outline-none', widthClassName)}>
          <AspectRatio
            ratio={ratio}
            className="overflow-hidden rounded-lg border border-border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-foreground-tertiary">
                <ManyakSymbolIcon aria-hidden="true" className="size-8" />
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Spinner className="size-6" />
              </div>
            )}
          </AspectRatio>
        </button>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              aria-label={
                ariaLabelPrefix ? `${ariaLabelPrefix} ${upload}` : undefined
              }
              onClick={open}>
              <HugeiconsIcon icon={ImageUpload01Icon} aria-hidden="true" />
              {upload}
            </Button>
            {image && (
              <Button
                type="button"
                variant="ghost"
                className="text-foreground-secondary"
                disabled={isUploading}
                aria-label={
                  ariaLabelPrefix
                    ? `${ariaLabelPrefix} ${label} ${removeLabel}`
                    : undefined
                }
                onClick={remove}>
                {removeLabel}
              </Button>
            )}
          </div>
          <FieldDescription className="break-keep text-foreground-secondary">
            {description}
            <span className="block text-xs">{fileRule}</span>
          </FieldDescription>
        </div>
      </div>
      <input id={id} {...inputProps} />
    </Field>
  );
}
