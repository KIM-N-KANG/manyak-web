import { useEffect, useRef, useState } from 'react';

import type { HistoryLayerKind } from '@/lib/history-layer-stack';
import { openLayer } from '@/lib/history-layers';

type UseBackLayerOptions = {
  open: boolean;
  /** 거짓이면 레이어를 열지 않는다. 뒤로가기에 다른 의미를 주는 오버레이가 끈다. */
  enabled?: boolean;
  kind?: HistoryLayerKind;
  /** 뒤로가기가 이 레이어에 닿았을 때 부른다. 최신 콜백을 ref로 부른다. */
  onBack: () => void;
};

/**
 * 열려 있는 동안 뒤로가기를 가로채는 히스토리 레이어를 유지하는 훅.
 *
 * `close` 레이어는 뒤로가기 뒤에도 `open`이 참으로 남으면(처리 중 잠금) 더미를 다시 쌓아
 * 다음 뒤로가기도 받는다. `guard`는 매니저가 스스로 다시 쌓는다.
 *
 * @param options 열림 여부, 사용 여부, 레이어 종류, 뒤로가기 콜백
 */
export function useBackLayer({
  open,
  enabled = true,
  kind = 'close',
  onBack,
}: UseBackLayerOptions): void {
  const onBackRef = useRef(onBack);
  const layerRef = useRef<ReturnType<typeof openLayer> | null>(null);
  const pendingRearmRef = useRef(false);
  const [backSeq, setBackSeq] = useState(0);
  const active = open && enabled;

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;

    const layer = openLayer({
      kind,
      onBack: () => {
        onBackRef.current();

        if (kind === 'close') {
          pendingRearmRef.current = true;
          setBackSeq((value) => value + 1);
        }
      },
    });

    layerRef.current = layer;

    return () => {
      layerRef.current = null;
      layer.close();
    };
  }, [active, kind]);

  // 뒤로가기 뒤에도 열려 있으면 소비자가 닫기를 거부한 것이므로 더미를 다시 쌓는다.
  useEffect(() => {
    if (!pendingRearmRef.current) return;

    pendingRearmRef.current = false;

    if (active) layerRef.current?.rearm();
  }, [backSeq, active]);
}
