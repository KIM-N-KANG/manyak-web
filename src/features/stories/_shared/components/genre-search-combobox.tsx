import { useRef, useState } from 'react';

import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import {
  GENRE_QUERY_MAX_LENGTH,
  GENRE_SEARCH_COPY,
} from '@/features/stories/_shared/constants/genre';
import { useGenreCatalog } from '@/features/stories/_shared/hooks/use-genre-catalog';
import { useGenreSearch } from '@/features/stories/_shared/hooks/use-genre-search';
import type { Genre } from '@/features/stories/_shared/utils/genre-catalog';

type GenreSearchComboboxProps = {
  id: string;
  /** 선택한 제공 장르 id. 장르 목록에 없는 id는 콤보박스 선택값에서 빠진다. */
  selectedIds: number[];
  /** 장르 선택 상한에 닿았는지. 참이면 아직 고르지 않은 항목만 비활성으로 두어 해제는 계속 할 수 있다. */
  isMaxSelectionReached: boolean;
  disabled?: boolean;
  /** 한 번에 장르 하나를 켜거나 끈다. `pressed`가 참이면 추가, 거짓이면 해제다. */
  onToggle: (genreId: number, pressed: boolean) => void;
};

/**
 * 제공 장르를 검색해 여러 개 고르는 콤보박스.
 *
 * @remarks
 * 다중 선택이지만 한 항목을 고르거나 풀면 바로 목록을 닫고 검색어를 비운 뒤 입력의 포커스를 뺀다. 목록 자리는
 * 로딩, 실패(다시 시도 버튼), 검색 대기(빈 자리 유지), 결과 없음 순으로 분기하며, 로딩과 실패 중에는 이전 결과를
 * 보이지 않는다.
 */
export function GenreSearchCombobox({
  id,
  selectedIds,
  isMaxSelectionReached,
  disabled = false,
  onToggle,
}: GenreSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { catalog } = useGenreCatalog();
  const search = useGenreSearch();
  const selectedGenres =
    catalog?.genres.filter((genre) => selectedIds.includes(genre.id)) ?? [];
  const items = search.showLoading || search.isFailed ? [] : search.genres;

  const handleValueChange = (next: Genre[]) => {
    const added = next.find((genre) => !selectedIds.includes(genre.id));
    const removed = selectedGenres.find(
      (genre) => !next.some(({ id }) => id === genre.id),
    );
    const target = added ?? removed;

    if (!target) return;

    onToggle(target.id, Boolean(added));
    setOpen(false);
    search.changeQuery('');
    inputRef.current?.blur();
  };

  return (
    <Combobox
      items={items}
      filter={null}
      multiple
      value={selectedGenres}
      onValueChange={handleValueChange}
      inputValue={search.query}
      onInputValueChange={search.changeQuery}
      open={open}
      onOpenChange={setOpen}
      itemToStringLabel={(genre: Genre) => genre.name}
      isItemEqualToValue={(item: Genre, value: Genre) => item.id === value.id}
      disabled={disabled}>
      <div ref={anchorRef}>
        <ComboboxInput
          id={id}
          ref={inputRef}
          className="w-full"
          placeholder={GENRE_SEARCH_COPY.placeholder}
          maxLength={GENRE_QUERY_MAX_LENGTH}
          enterKeyHint="done"
          disabled={disabled}
          onInput={(event) => search.changeQuery(event.currentTarget.value)}
          triggerLabel={GENRE_SEARCH_COPY.openList}>
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
        </ComboboxInput>
      </div>
      <ComboboxContent anchor={anchorRef}>
        {search.showLoading ? (
          <p
            role="status"
            className="py-2 text-center text-sm text-muted-foreground">
            {GENRE_SEARCH_COPY.loading}
          </p>
        ) : search.isFailed ? (
          <button
            type="button"
            className="w-full py-2 text-center text-sm text-muted-foreground"
            onClick={search.retry}>
            {GENRE_SEARCH_COPY.retry}
          </button>
        ) : items.length === 0 ? (
          search.isWaiting ? (
            <div aria-hidden="true" className="h-10" />
          ) : (
            <p
              role="status"
              className="py-2 text-center text-sm text-muted-foreground">
              {GENRE_SEARCH_COPY.empty}
            </p>
          )
        ) : null}
        <ComboboxList>
          {(genre: Genre) => {
            const isSelected = selectedIds.includes(genre.id);

            return (
              <ComboboxItem
                key={genre.id}
                value={genre}
                disabled={!isSelected && isMaxSelectionReached}>
                {genre.name}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
