import { usePresignDraftImage } from '@/api/generated/endpoints/stories/stories';
import type { ImagePresignRequestKind } from '@/api/generated/models';

/**
 * 등록 전 이미지를 올리는 훅. presign으로 받은 URL에 파일을 PUT 하고, 등록 요청에 넣을 객체 키를 반환한다.
 */
export function useDraftImageUpload() {
  const presign = usePresignDraftImage();

  return async (file: File, kind: ImagePresignRequestKind) => {
    const response = await presign.mutateAsync({
      data: { kind, contentType: file.type, contentLength: file.size },
    });
    const { uploadUrl, objectKey } =
      response.status === 201 ? response.data : {};

    if (!uploadUrl || !objectKey) {
      throw new Error('Presign response has no upload URL');
    }

    // presigned S3 PUT은 백엔드 API가 아니라 생성된 호출 함수가 없다. 서명한 Content-Type을 그대로 보낸다.
    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!upload.ok) {
      throw new Error(`Draft image upload failed: ${upload.status}`);
    }

    return objectKey;
  };
}
