import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';

import type { ChatListItem } from '../types';
import { ChatCard } from './chat-card';

const MOCK_CHATS: ChatListItem[] = [
  {
    id: 10,
    storyId: 1,
    storyTitle: '호아킨 아카데미의 무속성 신입생',
    lastStoryPreview: '검사장은 한순간 숨소리조차 사라진 듯 조용해졌다.',
    updatedAt: '2026-06-12T12:10:00Z',
  },
  {
    id: 11,
    storyId: 2,
    storyTitle: '달빛 아래의 계약',
    lastStoryPreview: '낡은 계약서 위로 푸른 달빛이 천천히 번지기 시작했다.',
    updatedAt: '2026-06-12T13:25:00Z',
  },
  {
    id: 12,
    storyId: 3,
    storyTitle: '회귀한 공작가의 막내딸',
    lastStoryPreview:
      '그녀는 거울 속 열두 살의 자신을 바라보며 조용히 숨을 삼켰다.',
    updatedAt: '2026-06-13T09:40:00Z',
  },
  {
    id: 13,
    storyId: 4,
    storyTitle: '멸망한 도시의 마지막 헌터',
    lastStoryPreview: '폐허가 된 역 광장 너머에서 붉은 경고등이 다시 깜빡였다.',
    updatedAt: '2026-06-13T18:15:00Z',
  },
  {
    id: 14,
    storyId: 5,
    storyTitle: '악녀는 오늘도 퇴근하고 싶다',
    lastStoryPreview:
      '황태자의 고백을 들은 순간, 그녀는 사직서를 어디에 뒀는지 떠올렸다.',
    updatedAt: '2026-06-14T11:05:00Z',
  },
  {
    id: 15,
    storyId: 6,
    storyTitle: '탑의 99층에서 살아남는 법',
    lastStoryPreview: '시스템 창에는 단 하나의 문장만이 선명하게 떠올랐다.',
    updatedAt: '2026-06-14T22:30:00Z',
  },
  {
    id: 16,
    storyId: 7,
    storyTitle: '재벌 3세는 복수를 설계한다',
    lastStoryPreview:
      '회의실 문이 닫히자, 그의 미소에서 마지막 온기가 사라졌다.',
    updatedAt: '2026-06-15T08:20:00Z',
  },
  {
    id: 17,
    storyId: 8,
    storyTitle: '빙의했더니 최종 보스의 비서였다',
    lastStoryPreview:
      '책상 위 일정표에는 오늘 죽어야 할 사람의 이름이 적혀 있었다.',
    updatedAt: '2026-06-15T16:45:00Z',
  },
  {
    id: 18,
    storyId: 9,
    storyTitle: '비 내리는 여관의 편지',
    lastStoryPreview: '젖은 봉투 안쪽에서 낯선 왕가의 인장이 모습을 드러냈다.',
    updatedAt: '2026-06-16T01:10:00Z',
  },
  {
    id: 19,
    storyId: 10,
    storyTitle: '좀비 아포칼립스의 오메가 혈청',
    lastStoryPreview:
      '유리관 속 혈청이 검게 물드는 순간, 연구소의 모든 문이 잠겼다.',
    updatedAt: '2026-06-16T20:55:00Z',
  },
];

export function ChatList() {
  return (
    <ul className="flex flex-col gap-2 py-4">
      {MOCK_CHATS.map((chat, index) => (
        <Fragment key={chat.id}>
          <li>
            <ChatCard chat={chat} />
          </li>
          {index < MOCK_CHATS.length - 1 && (
            <Separator className="mx-4 data-horizontal:w-auto" />
          )}
        </Fragment>
      ))}
    </ul>
  );
}
