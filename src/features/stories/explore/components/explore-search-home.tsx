import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { EXPLORE_SEARCH_COPY } from '@/features/stories/_shared/constants/explore-search';
import { useGenreCatalog } from '@/features/stories/_shared/hooks/use-genre-catalog';
import { cn } from '@/lib/utils';

import {
  clearRecentSearches,
  removeRecentSearch,
  useRecentSearches,
} from '../utils/recent-search-storage';

const CHIP_CLASS =
  'rounded-full bg-muted text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

type ExploreSearchHomeProps = {
  onSearch: (term: string) => void;
};

export function ExploreSearchHome({ onSearch }: ExploreSearchHomeProps) {
  const recentSearches = useRecentSearches();
  const { catalog } = useGenreCatalog();
  const featuredGenres = catalog?.featuredGenres ?? [];

  return (
    <div className="flex flex-col gap-8 px-4 pt-2 pb-4">
      {recentSearches.length > 0 && (
        <section aria-labelledby="recent-searches-title">
          <div className="flex h-8 items-center justify-between">
            <h2 id="recent-searches-title" className="text-lg font-semibold">
              {EXPLORE_SEARCH_COPY.recentTitle}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-3 text-foreground-secondary"
              onClick={clearRecentSearches}>
              {EXPLORE_SEARCH_COPY.clearRecent}
            </Button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <li
                key={term}
                className={cn('flex h-10 items-center', CHIP_CLASS)}>
                <button
                  type="button"
                  className="h-full max-w-48 truncate pl-3.5 outline-none"
                  onClick={() => onSearch(term)}>
                  {term}
                </button>
                <button
                  type="button"
                  aria-label={EXPLORE_SEARCH_COPY.removeRecent(term)}
                  className="flex size-10 items-center justify-center text-foreground-tertiary outline-none"
                  onClick={() => removeRecentSearch(term)}>
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    className="size-3.5"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {featuredGenres.length > 0 && (
        <section aria-labelledby="search-genres-title">
          <h2
            id="search-genres-title"
            className="flex h-8 items-center text-lg font-semibold">
            {EXPLORE_SEARCH_COPY.genreTitle}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {featuredGenres.map((genre) => (
              <li key={genre.id}>
                <button
                  type="button"
                  className={cn('h-10 px-3.5', CHIP_CLASS)}
                  onClick={() => onSearch(genre.name)}>
                  {genre.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
