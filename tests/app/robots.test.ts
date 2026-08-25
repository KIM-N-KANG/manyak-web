import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';
import { APP_PATH } from '@/constants/app-path';

describe('robots', () => {
  const result = robots();

  it('allows the representative pages and blocks private paths', () => {
    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        APP_PATH.MAIN.CHATS,
        APP_PATH.MAIN.CREATE,
        APP_PATH.MAIN.MY,
        APP_PATH.LOGIN,
        '/stories/',
      ],
    });
  });

  it('announces the sitemap location on the service origin', () => {
    expect(result.sitemap).toBe('https://manyak.app/sitemap.xml');
  });
});
