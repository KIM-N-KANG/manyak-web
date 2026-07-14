import { useEffect, useRef } from 'react';

type UseCloseOnBackOptions = {
  open: boolean;
  onClose: () => void;
};

/**
 * 오버레이(뷰어·시트 등)가 열려 있는 동안 브라우저/모바일 뒤로가기를
 * 페이지 이동 대신 "오버레이 닫기"로 동작하게 하는 훅.
 *
 * - 열릴 때 더미 히스토리 항목을 1개 쌓고, popstate가 오면 `onClose`만 호출한다.
 * - X·배경 탭 등 UI로 닫힐 때는 `history.back()`으로 더미를 소비해
 *   히스토리에 잔여 항목이 남지 않게 한다(`use-prevent-page-leave`와 같은 원리).
 *
 * @param open 오버레이 열림 여부
 * @param onClose 뒤로가기 시 호출할 닫기 콜백
 */
export function useCloseOnBack({ open, onClose }: UseCloseOnBackOptions) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let closedByPopState = false;

    const handlePopState = () => {
      closedByPopState = true;
      onCloseRef.current();
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // UI로 닫힌 경우에만 더미 항목이 남아 있으므로 소비한다.
      if (!closedByPopState) {
        window.history.back();
      }
    };
  }, [open]);
}
