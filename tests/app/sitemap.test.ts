import { describe, expect, it } from 'vitest';

import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('lists only the static public pages', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://manyak.app/',
      'https://manyak.app/terms',
      'https://manyak.app/privacy',
    ]);
  });
});
