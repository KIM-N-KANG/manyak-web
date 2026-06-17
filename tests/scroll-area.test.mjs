import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () => readFileSync('src/components/ui/scroll-area.tsx', 'utf8');

test('scroll area keeps scrollbars hidden until scrolling or hovering', () => {
  const text = source();

  assert.match(text, /function ScrollBar/);
  assert.match(text, /opacity-0/);
  assert.match(text, /data-scrolling:opacity-100/);
  assert.match(text, /data-hovering:opacity-100/);
  assert.match(text, /transition-opacity/);
  assert.match(text, /duration-300/);
  assert.match(text, /delay-400/);
  assert.match(text, /data-scrolling:delay-0/);
  assert.match(text, /data-hovering:delay-0/);
});
