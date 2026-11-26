import { useState } from 'react';

/** @template Details Base UI가 `onOpenChange`에 넘기는 이벤트 상세 타입 */
type UseOverlayOpenStateOptions<Details> = {
  /** 넘기면 제어 모드로 이 값을 그대로 따르고, 내부 상태는 쓰지 않는다. */
  open?: boolean;
  /**
   * 비제어 모드의 초기 열림 여부다.
   *
   * @default false
   */
  defaultOpen?: boolean;
  /** 제어, 비제어 모드 모두에서 열림이 바뀔 때 부른다. */
  onOpenChange?: (open: boolean, details: Details) => void;
};

/**
 * 오버레이 래퍼가 Base UI에 항상 제어 모드로 `open`을 넘기도록 열림 상태를 합치는 훅.
 * `open`이 없으면 `defaultOpen`으로 시작하는 내부 상태를 쓰고, 있으면 그대로 따른다.
 *
 * @param options 소비자가 넘긴 open, defaultOpen, onOpenChange
 * @returns 현재 열림 여부와 변경 함수
 */
export function useOverlayOpenState<Details>({
  open,
  defaultOpen = false,
  onOpenChange,
}: UseOverlayOpenStateOptions<Details>): [
  boolean,
  (open: boolean, details: Details) => void,
] {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const handleOpenChange = (next: boolean, details: Details) => {
    if (open === undefined) setUncontrolledOpen(next);

    onOpenChange?.(next, details);
  };

  return [isOpen, handleOpenChange];
}

/**
 * 뒤로가기로 닫을 때 소비자의 `onOpenChange`에 넘길 Base UI 형태의 이벤트 상세다.
 * reason은 `none`이며 소비자 중 reason을 분기하는 곳은 없다.
 *
 * @returns Base UI ChangeEventDetails 형태의 값
 */
export function createBackCloseDetails<Details>(): Details {
  return {
    reason: 'none',
    event: new Event('popstate'),
    cancel: () => {},
    allowPropagation: () => {},
    isCanceled: false,
    isPropagationAllowed: false,
    trigger: undefined,
  } as Details;
}
