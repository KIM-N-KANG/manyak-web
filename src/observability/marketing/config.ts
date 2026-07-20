/**
 * 픽셀 ID가 있고 production 환경일 때만 Meta 픽셀 전송을 활성화한다.
 *
 * @param input pixelId(Meta 픽셀 ID)와 nodeEnv(빌드 환경)를 담은 객체
 * @returns Meta 픽셀 전송 활성화 여부
 */
export function resolveMetaPixelEnabled(input: {
  pixelId?: string;
  nodeEnv?: string;
}): boolean {
  return Boolean(input.pixelId) && input.nodeEnv === 'production';
}

/** Meta 픽셀 ID. 미설정 환경에서는 undefined. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** 현재 빌드 환경에서 Meta 픽셀 전송이 활성화됐는지 여부. */
export const IS_META_PIXEL_ENABLED = resolveMetaPixelEnabled({
  pixelId: META_PIXEL_ID,
  nodeEnv: process.env.NODE_ENV,
});
