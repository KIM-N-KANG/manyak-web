/** @file `E2E_SEO=1`일 때 `playwright.config.ts`가 띄우는 SEO 스펙용 가짜 백엔드.
 *
 * 127.0.0.1:3199에서 오리지널 스토리 목록, 홈, 상세를 응답한다. 서버 렌더링은 브라우저 라우트 목이 닿지 않는
 * Next 서버에서 백엔드를 직접 부르므로, `API_BASE_URL`을 이 서버로 돌려 첫 HTML을 검증한다.
 * `seo-unavailable`은 503, `seo-missing`과 그 밖의 경로는 404, `seo-private`는 비공개 스토리로 응답한다.
 */
import { createServer } from 'node:http';

/**
 * 공개 오리지널 스토리 상세 응답이다. `PRIVATE_` 접두 값은 공개 페이지에 나오면 안 되는 필드의 미끼라서,
 * 스펙이 첫 HTML에 이 접두가 없는지 단언한다.
 */
const original = {
  id: 'seo-original',
  title: '별빛 도서관',
  oneLineIntro: '잃어버린 이야기를 찾는 밤',
  description: '별빛이 비추는 서가에서 나의 이야기를 찾아보세요.',
  genres: ['판타지'],
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  isOriginal: true,
  isOwner: false,
  isLiked: false,
  reachedEndings: ['PRIVATE_REACHED_ENDING'],
  lorebooks: [{ content: 'PRIVATE_LOREBOOK' }],
  mainEvents: [{ content: 'PRIVATE_MAIN_EVENT' }],
  startSettings: [
    {
      id: 'start-1',
      name: '도서관 입구',
      startSituation: '도서관의 문이 열립니다.',
      prologue: 'PRIVATE_PROLOGUE',
      endings: [
        {
          name: '책을 찾은 밤',
          requirement: { achievementCondition: 'PRIVATE_REQUIREMENT' },
          epilogue: 'PRIVATE_EPILOGUE',
        },
      ],
    },
  ],
};

createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://127.0.0.1:3199');

  response.setHeader('Content-Type', 'application/json');

  if (pathname === '/api/v1/stories') {
    response.end(
      JSON.stringify({
        items: [
          {
            id: original.id,
            title: original.title,
            oneLineIntro: original.oneLineIntro,
            isOriginal: true,
          },
          { id: 'seo-unavailable' },
          { id: 'seo-missing' },
          { id: 'seo-private' },
        ],
        nextCursor: null,
      }),
    );
  } else if (pathname === '/api/v1/stories/home') {
    response.end(
      JSON.stringify({
        sections: [
          {
            id: null,
            name: '인기 스토리',
            items: [
              {
                id: original.id,
                title: original.title,
                oneLineIntro: original.oneLineIntro,
                isOriginal: true,
              },
            ],
          },
        ],
      }),
    );
  } else if (pathname === '/api/v1/stories/seo-original') {
    response.end(JSON.stringify(original));
  } else if (pathname === '/api/v1/stories/seo-private') {
    response.end(
      JSON.stringify({
        ...original,
        id: 'seo-private',
        visibility: 'PRIVATE',
        title: 'PRIVATE_STORY_TITLE',
      }),
    );
  } else if (pathname === '/') {
    response.end('{}');
  } else {
    response.statusCode = pathname.endsWith('seo-unavailable') ? 503 : 404;
    response.end('{}');
  }
}).listen(3199, '127.0.0.1');
