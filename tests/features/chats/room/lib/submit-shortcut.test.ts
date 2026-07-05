import type { KeyboardEvent } from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isSubmitShortcut,
  submitOnShortcut,
} from '@/features/chats/room/lib/submit-shortcut';

type EventOverrides = {
  key?: string;
  shiftKey?: boolean;
  isComposing?: boolean;
};

function makeEvent(overrides: EventOverrides = {}) {
  const { key = 'Enter', shiftKey = false, isComposing = false } = overrides;

  return {
    key,
    shiftKey,
    nativeEvent: { isComposing },
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

function stubPointer(coarse: boolean) {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: coarse && query.includes('coarse'),
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isSubmitShortcut (desktop / fine pointer)', () => {
  it('treats plain Enter as a submit shortcut', () => {
    stubPointer(false);
    expect(isSubmitShortcut(makeEvent())).toBe(true);
  });

  it('does not treat Shift+Enter as a submit shortcut', () => {
    stubPointer(false);
    expect(isSubmitShortcut(makeEvent({ shiftKey: true }))).toBe(false);
  });

  it('ignores Enter while IME composition is in progress', () => {
    stubPointer(false);
    expect(isSubmitShortcut(makeEvent({ isComposing: true }))).toBe(false);
  });

  it('ignores non-Enter keys', () => {
    stubPointer(false);
    expect(isSubmitShortcut(makeEvent({ key: 'a' }))).toBe(false);
  });
});

describe('isSubmitShortcut (mobile / coarse pointer)', () => {
  it('does NOT treat Enter as a submit shortcut so a newline is inserted', () => {
    stubPointer(true);
    expect(isSubmitShortcut(makeEvent())).toBe(false);
  });
});

describe('submitOnShortcut', () => {
  it('prevents default and submits on desktop Enter when allowed', () => {
    stubPointer(false);

    const event = makeEvent();
    const onSubmit = vi.fn();

    submitOnShortcut(event, true, onSubmit);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('prevents default but does not submit when submitting is disabled', () => {
    stubPointer(false);

    const event = makeEvent();
    const onSubmit = vi.fn();

    submitOnShortcut(event, false, onSubmit);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does nothing on mobile Enter so the textarea inserts a newline', () => {
    stubPointer(true);

    const event = makeEvent();
    const onSubmit = vi.fn();

    submitOnShortcut(event, true, onSubmit);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
