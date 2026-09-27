import { type ChangeEvent, useRef, useState } from 'react';

import { ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import { toast } from 'sonner';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { GENERAL_STORY_COVER_COPY } from '@/features/studio/general/constants';
import { useDraftImageUpload } from '@/features/studio/general/hooks/use-draft-image-upload';
import {
  DRAFT_IMAGE_CONTENT_TYPES,
  getDraftImageFileError,
} from '@/features/studio/general/utils/draft-image-file';

export type GeneralStoryCover = {
  objectKey: string;
  previewUrl: string;
};

type GeneralStoryCoverFieldProps = {
  cover: GeneralStoryCover | null;
  onChange: (cover: GeneralStoryCover | null) => void;
};

export function GeneralStoryCoverField({
  cover,
  onChange,
}: GeneralStoryCoverFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useDraftImageUpload();
  const [uploadingPreviewUrl, setUploadingPreviewUrl] = useState<string | null>(
    null,
  );
  const isUploading = uploadingPreviewUrl !== null;
  const previewUrl = uploadingPreviewUrl ?? cover?.previewUrl ?? null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    const fileError = getDraftImageFileError(file);

    if (fileError) {
      toast.error(fileError);

      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    setUploadingPreviewUrl(nextPreviewUrl);

    try {
      const objectKey = await upload(file, 'COVER');

      if (cover) {
        URL.revokeObjectURL(cover.previewUrl);
      }

      onChange({ objectKey, previewUrl: nextPreviewUrl });
    } catch {
      URL.revokeObjectURL(nextPreviewUrl);
      toast.error(TOAST_MESSAGE.DRAFT_IMAGE_UPLOAD_FAILED);
    } finally {
      setUploadingPreviewUrl(null);
    }
  };

  const handleRemove = () => {
    if (cover) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    onChange(null);
  };

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor="general-story-cover">
        {GENERAL_STORY_COVER_COPY.label}
      </FieldLabel>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="w-32 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <AspectRatio
            ratio={3 / 4}
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
              onClick={() => inputRef.current?.click()}>
              <HugeiconsIcon icon={ImageUpload01Icon} aria-hidden="true" />
              {GENERAL_STORY_COVER_COPY.upload}
            </Button>
            {cover && (
              <Button
                type="button"
                variant="ghost"
                className="text-foreground-secondary"
                disabled={isUploading}
                onClick={handleRemove}>
                {GENERAL_STORY_COVER_COPY.remove}
              </Button>
            )}
          </div>
          <FieldDescription className="text-foreground-secondary">
            {GENERAL_STORY_COVER_COPY.description}
            <br />
            {GENERAL_STORY_COVER_COPY.fileRule}
          </FieldDescription>
        </div>
      </div>
      <input
        ref={inputRef}
        id="general-story-cover"
        type="file"
        accept={DRAFT_IMAGE_CONTENT_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </Field>
  );
}
