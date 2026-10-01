import { type ChangeEvent, useRef, useState } from 'react';
import type { Area } from 'react-easy-crop';

import { toast } from 'sonner';

import type { ImagePresignRequestKind } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { cropImageToJpeg } from '@/features/studio/general/utils/crop-draft-image';
import {
  DRAFT_IMAGE_CONTENT_TYPES,
  getDraftImageFileError,
} from '@/features/studio/general/utils/draft-image-file';

import { useDraftImageUpload } from './use-draft-image-upload';

/**
 * 등록 전에 올린 이미지다. 요청에는 객체 키를, 미리보기에는 잘라낸 이미지의 blob URL을 쓴다.
 * 임시 저장 뒤 미리보기를 다시 만들 수 있게 잘라낸 이미지도 함께 둔다. 검수 제출본에서 복원한
 * 이미지는 파일 없이(`blob: null`) 서버 미리보기 URL만 가진다.
 */
export type DraftImage = {
  objectKey: string;
  previewUrl: string;
  blob: Blob | null;
};

type UseDraftImagePickerOptions = {
  kind: ImagePresignRequestKind;
  image: DraftImage | null;
  onChange: (image: DraftImage | null) => void;
};

/**
 * 파일 선택부터 형식·크기 검사, 정해진 비율로 자르기, 등록 전 업로드, 미리보기 URL 해제까지 맡는 훅.
 * 숨긴 파일 입력에 `inputProps`를 펼치고 `open`으로 파일 선택 창을 연다. 파일을 고르면 `crop`이 생기고,
 * 자르기 시트에서 고른 영역으로 `crop.confirm`을 부르면 잘라낸 JPEG를 올린다.
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
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    setCropSourceUrl(URL.createObjectURL(file));
  };

  const cancelCrop = () => {
    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl);
    }

    setCropSourceUrl(null);
  };

  const confirmCrop = async (area: Area) => {
    if (!cropSourceUrl) {
      return;
    }

    const sourceUrl = cropSourceUrl;
    let nextPreviewUrl: string | null = null;

    setCropSourceUrl(null);

    try {
      const blob = await cropImageToJpeg(sourceUrl, area);

      nextPreviewUrl = URL.createObjectURL(blob);
      setUploadingPreviewUrl(nextPreviewUrl);

      const objectKey = await upload(blob, kind);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      onChange({ objectKey, previewUrl: nextPreviewUrl, blob });
    } catch {
      if (nextPreviewUrl) {
        URL.revokeObjectURL(nextPreviewUrl);
      }

      toast.error(TOAST_MESSAGE.DRAFT_IMAGE_UPLOAD_FAILED);
    } finally {
      URL.revokeObjectURL(sourceUrl);
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
    crop: cropSourceUrl
      ? { imageUrl: cropSourceUrl, cancel: cancelCrop, confirm: confirmCrop }
      : null,
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
