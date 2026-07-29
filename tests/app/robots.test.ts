import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';

describe('robots', () => {
  const result = robots();

  it('allows the representative pages and blocks private paths', () => {
    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/chats', '/my', '/login', '/stories/'],
    });
  });

  it('announces the sitemap location on the service origin', () => {
    expect(result.sitemap).toBe('https://manyak.app/sitemap.xml');
  });
});
