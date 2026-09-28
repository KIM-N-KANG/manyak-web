import { createContext, use } from 'react';

import type { GeneralStoryRegisterError } from '@/features/studio/general/utils/register-validation';

/** 등록하기를 누른 뒤의 칸별 오류다. 누르기 전에는 null이라 어느 칸에도 표시하지 않는다. */
export const GeneralStoryRegisterErrorsContext = createContext<
  GeneralStoryRegisterError[] | null
>(null);

/**
 * 등록하기를 누른 뒤 칸 하나에 보일 오류 문구를 반환한다.
 *
 * @param key `REGISTER_ERROR_KEY`로 만든 칸 키. 없으면 오류가 없다.
 * @returns 오류 문구, 없으면 null
 */
export function useRegisterError(key?: string) {
  const errors = use(GeneralStoryRegisterErrorsContext);

  return (key && errors?.find((error) => error.key === key)?.message) || null;
}
