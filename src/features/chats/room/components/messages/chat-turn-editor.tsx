'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { CHAT_TURN_EDIT_COPY } from '../../constants';
import type { TurnEditor } from '../../types';
import { submitOnShortcut } from '../../utils/submit-shortcut';

type ChatTurnEditorProps = {
  editor: TurnEditor;
  /** 고치기 전 입력. 그대로면 보내지 않는다. */
  original: string;
  /** 다른 생성이 진행 중이면 true다. 고치던 입력은 유지하고 보내기만 막는다. */
  disabled: boolean;
};

/** 사용자 입력 버블 자리에서 입력을 고치는 편집기. */
export function ChatTurnEditor({
  editor,
  original,
  disabled,
}: ChatTurnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trimmed = editor.draft.trim();
  const canSubmit =
    !disabled && trimmed.length > 0 && trimmed !== original.trim();

  // 열린 편집기가 헤더에 가리지 않게, 화면 밖으로 걸친 경우에만 헤더 아래까지 스크롤한다.
  useEffect(() => {
    containerRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex scroll-mt-(--chat-header-height) flex-col gap-3 bg-muted px-4 py-5">
      <Textarea
        aria-label={CHAT_TURN_EDIT_COPY.field}
        value={editor.draft}
        autoFocus
        onFocus={(event) => {
          const { length } = event.currentTarget.value;

          event.currentTarget.setSelectionRange(length, length);
        }}
        onChange={(event) => editor.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            editor.onCancel();

            return;
          }

          submitOnShortcut(event, canSubmit, editor.onSubmit);
        }}
        className="resize-none bg-background text-base md:text-base"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={editor.onCancel}>
          {CHAT_TURN_EDIT_COPY.cancel}
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={editor.onSubmit}>
          {CHAT_TURN_EDIT_COPY.submit}
        </Button>
      </div>
    </div>
  );
}
