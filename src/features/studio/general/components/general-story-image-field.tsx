import { createContext, use } from 'react';

import { ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import type { ImagePresignRequestKind } from '@/api/generated/models';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { GENERAL_STORY_COVER_COPY } from '@/features/studio/general/constants';
import {
  type DraftImage,
  useDraftImagePicker,
} from '@/features/studio/general/hooks/use-draft-image-picker';
import { cn } from '@/lib/utils';

import { GeneralStoryImageCropSheet } from './general-story-image-crop-sheet';
import { useRegisterError } from './general-story-register-errors';

/** 이미지 칸에 삭제 버튼을 둘지다. 스토리 수정은 이미지를 바꾸기만 하고 지우기는 이미지 편집에서 다룬다. */
export const GeneralStoryImageRemovableContext = createContext(true);

type GeneralStoryImageFieldProps = {
  id: string;
  label: string;
  kind: ImagePresignRequestKind;
  /** 미리보기와 자르기 비율(가로/세로)이다. */
  ratio: number;
  /** 미리보기 폭 클래스다. */
  widthClassName: string;
  /** 미리보기 옆 버튼 아래에 두는 권장 비율 안내다. */
  ratioHint: string;
  /** 다른 입력처럼 입력 영역 아래에 두는 설명이다. */
  description?: string;
  /** 같은 화면에 여러 개가 있을 때 버튼을 구분하는 접근 가능한 이름 앞머리다. */
  ariaLabelPrefix?: string;
  /** 검수 결과 등 이 칸의 오류를 찾는 `REGISTER_ERROR_KEY`다. 오류는 설명 자리에 보인다. */
  registerErrorKey?: string;
  image: DraftImage | null;
  onChange: (image: DraftImage | null) => void;
};

export function GeneralStoryImageField({
  id,
  label,
  kind,
  ratio,
  widthClassName,
  ratioHint,
  description,
  ariaLabelPrefix,
  registerErrorKey,
  image,
  onChange,
}: GeneralStoryImageFieldProps) {
  const error = useRegisterError(registerErrorKey);
  const removable = use(GeneralStoryImageRemovableContext);
  const { isUploading, previewUrl, open, remove, crop, inputProps } =
    useDraftImagePicker({ kind, image, onChange });
  const {
    upload,
    change,
    remove: removeLabel,
    fileRule,
  } = GENERAL_STORY_COVER_COPY;
  const uploadLabel = image ? change : upload;

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
            className={cn(
              'overflow-hidden rounded-lg border border-border bg-muted',
              error && 'border-destructive',
            )}>
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
                ariaLabelPrefix
                  ? `${ariaLabelPrefix} ${uploadLabel}`
                  : undefined
              }
              onClick={open}>
              <HugeiconsIcon icon={ImageUpload01Icon} aria-hidden="true" />
              {uploadLabel}
            </Button>
            {image && removable && (
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
            {ratioHint}
            <span className="block text-xs">{fileRule}</span>
          </FieldDescription>
        </div>
      </div>
      {error ? (
        <FieldError data-register-error>{error}</FieldError>
      ) : (
        description && (
          <FieldDescription className="break-keep text-foreground-secondary">
            {description}
          </FieldDescription>
        )
      )}
      <input id={id} {...inputProps} />
      {crop && (
        <GeneralStoryImageCropSheet
          imageUrl={crop.imageUrl}
          aspect={ratio}
          onCancel={crop.cancel}
          onConfirm={crop.confirm}
        />
      )}
    </Field>
  );
}
