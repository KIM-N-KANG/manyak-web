import type { KeyboardEvent } from 'react';

export function isSubmitShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
): boolean {
  return (
    event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing
  );
}

export function submitOnShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  canSubmit: boolean,
  onSubmit: () => void,
) {
  if (!isSubmitShortcut(event)) {
    return;
  }

  event.preventDefault();

  if (canSubmit) {
    onSubmit();
  }
}
