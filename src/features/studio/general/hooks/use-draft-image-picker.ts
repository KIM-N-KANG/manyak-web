import { type ChangeEvent, useRef, useState } from 'react';

import { toast } from 'sonner';

import type { ImagePresignRequestKind } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  DRAFT_IMAGE_CONTENT_TYPES,
  getDraftImageFileError,
} from '@/features/studio/general/utils/draft-image-file';

import { useDraftImageUpload } from './use-draft-image-upload';

/** 등록 전에 올린 이미지다. 요청에는 객체 키를, 미리보기에는 고른 파일의 blob URL을 쓴다. */
export type DraftImage = {
  objectKey: string;
  previewUrl: string;
};

type UseDraftImagePickerOptions = {
  kind: ImagePresignRequestKind;
  image: DraftImage | null;
  onChange: (image: DraftImage | null) => void;
};

/**
 * 파일 선택부터 형식·크기 검사, 등록 전 업로드, 미리보기 URL 해제까지 맡는 훅.
 * 숨긴 파일 입력에 `inputProps`를 펼치고 `open`으로 파일 선택 창을 연다.
 */
export function useDraftImagePicker({
  kind,
  image,
  onChange,
}: UseDraftImagePickerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useDraftImageUpload();
  const [uploadingPreviewUrl, setUploadingPreviewUrl] = useState<string | null>(
    null,
  );

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
      const objectKey = await upload(file, kind);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      onChange({ objectKey, previewUrl: nextPreviewUrl });
    } catch {
      URL.revokeObjectURL(nextPreviewUrl);
      toast.error(TOAST_MESSAGE.DRAFT_IMAGE_UPLOAD_FAILED);
    } finally {
      setUploadingPreviewUrl(null);
    }
  };

  const remove = () => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }

    onChange(null);
  };

  return {
    isUploading: uploadingPreviewUrl !== null,
    previewUrl: uploadingPreviewUrl ?? image?.previewUrl ?? null,
    open: () => inputRef.current?.click(),
    remove,
    inputProps: {
      ref: inputRef,
      type: 'file' as const,
      accept: DRAFT_IMAGE_CONTENT_TYPES.join(','),
      className: 'sr-only',
      tabIndex: -1,
      onChange: handleFileChange,
    },
  };
}
