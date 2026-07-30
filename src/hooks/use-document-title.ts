'use client';

import { useEffect } from 'react';

import { formatDocumentTitle } from '@/constants/site';

/**
 * 문서 제목(브라우저 탭)을 `제목 - 마냑` 형식으로 맞추는 훅.
 *
 * 서버 메타데이터로 제목을 만들 수 없는 화면(로그인 세션·게스트 식별자가 있어야 상세를
 * 읽을 수 있어 클라이언트에서만 데이터를 받는 화면)에서 쓴다. 제목이 아직 비어 있으면
 * 손대지 않아 서버가 렌더한 기본 제목이 그대로 남는다.
 *
 * @param title 서비스명 앞에 붙일 화면 제목
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (!title) {
      return;
    }

    document.title = formatDocumentTitle(title);
  }, [title]);
}
