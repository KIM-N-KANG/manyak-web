import type { Area } from 'react-easy-crop';

/** 잘라낸 이미지의 긴 변 최대 픽셀이다. 원본 영역이 더 작으면 늘리지 않는다. */
export const DRAFT_IMAGE_MAX_SIDE = 1440;

/** 잘라낸 이미지를 내보내는 JPEG 품질이다. */
const DRAFT_IMAGE_JPEG_QUALITY = 0.9;

/**
 * 원본에서 고른 영역을 내보낼 크기를 반환한다. 긴 변이 상한을 넘으면 비율을 유지해 줄이고, 작으면 그대로 둔다.
 *
 * @param area 원본 픽셀 기준으로 고른 영역의 크기
 * @returns 내보낼 정수 픽셀 크기
 */
export function getCropOutputSize({
  width,
  height,
}: Pick<Area, 'width' | 'height'>) {
  const scale = Math.min(1, DRAFT_IMAGE_MAX_SIDE / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * 이미지에서 고른 영역을 잘라 JPEG Blob으로 반환한다. Safari는 canvas에서 WebP를 만들지 못해 모든 기기에서 같은
 * 결과가 나오는 JPEG를 쓰고, 투명한 곳이 검게 바뀌지 않도록 흰 바탕을 먼저 칠한다.
 *
 * @param src 원본 이미지 URL(고른 파일의 blob URL)
 * @param area 원본 픽셀 기준으로 고른 영역
 * @returns 잘라낸 JPEG Blob
 * @throws 이미지를 디코딩하지 못하거나 canvas를 쓸 수 없으면 던진다.
 */
export async function cropImageToJpeg(src: string, area: Area): Promise<Blob> {
  const image = new Image();

  image.src = src;
  await image.decode();

  const { width, height } = getCropOutputSize(area);
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }

  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    width,
    height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/jpeg',
      DRAFT_IMAGE_JPEG_QUALITY,
    );
  });
}
