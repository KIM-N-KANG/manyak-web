import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('MaruBuri font utilities map to the next/font local variable without circular references', () => {
  const globalsSource = read('src/app/globals.css');
  const fontsSource = read('src/assets/fonts/fonts.ts');

  assert.match(fontsSource, /variable:\s*'--font-maruburi-family'/);
  assert.match(
    globalsSource,
    /--font-maruburi:\s*var\(--font-maruburi-family\);/,
  );
  assert.match(globalsSource, /--font-serif:\s*var\(--font-maruburi-family\);/);
  assert.doesNotMatch(
    globalsSource,
    /--font-maruburi:\s*var\(--font-maruburi\)/,
  );
});
