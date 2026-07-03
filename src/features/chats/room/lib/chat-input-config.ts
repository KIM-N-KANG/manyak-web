export type ChatInputMode = 'block' | 'plain';

export function isChatInputMode(value: string | null): value is ChatInputMode {
  return value === 'block' || value === 'plain';
}
