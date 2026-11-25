'use client';

import { type SubmitEvent, useRef, useState } from 'react';

import { CancelCircleIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { BackHeader } from '@/components/layout/back-header';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { APP_PATH } from '@/constants/app-path';
import {
  EXPLORE_SEARCH_COPY,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
} from '@/features/stories/_shared/constants/explore-search';
import {
  rememberScrollPosition,
  useScrollRestoration,
} from '@/hooks/use-scroll-restoration';

import { addRecentSearch } from '../utils/recent-search-storage';
import { ExploreSearchHome } from './explore-search-home';
import { ExploreSearchResults } from './explore-search-results';

/**
 * 스토리 검색 화면. 주소의 `q`가 검색어의 정본이다.
 *
 * @remarks
 * 제출한 검색어를 최근 검색어에 남기고 `?q=`에 반영한다. 주소는 Next 라우터 대신 `history.replaceState`로 바꾼다.
 * `q`가 있는 주소로 처음 연 정적 화면에서 라우터의 replace로 `q`를 빼는 이동이 프로덕션 빌드에서 반영되지 않고,
 * 검색마다 서버 왕복이 생기기 때문이다. 기록을 쌓지 않으므로 뒤로가기는 검색 화면을 연 곳으로 돌아간다. 최소 길이에
 * 못 미치는 검색어는 토스트로 알리고 주소를 바꾸지 않는다. 스크롤 위치는 검색어별 기록 항목마다 복원한다.
 *
 * @see 하네스 `docs/spec/STORY/CLIENT/WEB/DECISIONS.md`의 W-041
 */
export function ExploreSearchScreen() {
  const query = (useSearchParams().get('q') ?? '').trim();
  const [input, setInput] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const scrollKey = APP_PATH.EXPLORE_SEARCH(query);

  useScrollRestoration(scroller, scrollKey, { perHistoryEntry: true });

  const search = (term: string) => {
    const next = term.trim();

    if (next.length < SEARCH_QUERY_MIN_LENGTH) {
      toast(EXPLORE_SEARCH_COPY.tooShort);

      return;
    }

    setInput(next);
    addRecentSearch(next);
    inputRef.current?.blur();
    window.history.replaceState(null, '', APP_PATH.EXPLORE_SEARCH(next));
  };

  const clear = () => {
    setInput('');
    inputRef.current?.focus();

    if (query) window.history.replaceState(null, '', APP_PATH.EXPLORE_SEARCH());
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    search(input);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader fallbackHref={APP_PATH.MAIN.EXPLORE}>
        <form
          role="search"
          className="min-w-0 flex-1 pr-2.5"
          onSubmit={handleSubmit}>
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                aria-hidden="true"
              />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              aria-label={EXPLORE_SEARCH_COPY.label}
              placeholder={EXPLORE_SEARCH_COPY.placeholder}
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              autoFocus={!query}
              value={input}
              className="[&::-webkit-search-cancel-button]:hidden"
              onChange={(event) => setInput(event.target.value)}
            />
            {input && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={EXPLORE_SEARCH_COPY.clear}
                  className="text-foreground-tertiary"
                  onClick={clear}>
                  <HugeiconsIcon icon={CancelCircleIcon} aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </form>
      </BackHeader>
      <div
        ref={setScroller}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        onScroll={(event) =>
          rememberScrollPosition(scrollKey, event.currentTarget.scrollTop, {
            perHistoryEntry: true,
          })
        }>
        {query.length >= SEARCH_QUERY_MIN_LENGTH ? (
          <ExploreSearchResults query={query} />
        ) : (
          <ExploreSearchHome onSearch={search} />
        )}
      </div>
    </div>
  );
}
