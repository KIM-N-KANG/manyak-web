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
