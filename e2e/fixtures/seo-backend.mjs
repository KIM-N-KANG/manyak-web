import { createServer } from 'node:http';

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
