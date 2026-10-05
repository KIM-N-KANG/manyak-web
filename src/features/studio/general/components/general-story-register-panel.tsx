import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { CreateGeneralStoryRequestVisibility } from '@/api/generated/models';
import { Switch } from '@/components/motion/switch';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { GenreSearchCombobox } from '@/features/stories/_shared/components/genre-search-combobox';
import { TagChipGrid } from '@/features/stories/_shared/components/tag-chip-grid';
import { GENRE_SEARCH_COPY } from '@/features/stories/_shared/constants/genre';
import { useGenreCatalog } from '@/features/stories/_shared/hooks/use-genre-catalog';
import { getGenreChips } from '@/features/stories/_shared/utils/genre-catalog';
import { GENERAL_STORY_REGISTER_COPY } from '@/features/studio/general/constants';
import {
  type GeneralStoryGenreKey,
  type GeneralStoryGenreSelection,
  getSelectedGenreTagIds,
  toggleGenre,
} from '@/features/studio/general/utils/genre-selection';
import { REGISTER_ERROR_KEY } from '@/features/studio/general/utils/register-validation';

import { GeneralStoryInputField } from './general-story-input-field';
import { useRegisterError } from './general-story-register-errors';

const { genre, description, visibility, notice } = GENERAL_STORY_REGISTER_COPY;

const VISIBILITY_DESCRIPTION_ID = 'general-story-visibility-description';

const GENRE_SEARCH_ID = 'general-story-genre';

type GeneralStoryRegisterPanelProps = {
  genres: GeneralStoryGenreSelection;
  needsGenreReselection: boolean;
  allowsStoredGenres: boolean;
  onGenresChange: (genres: GeneralStoryGenreSelection) => void;
  storyDescription: string;
  onStoryDescriptionChange: (value: string) => void;
  storyVisibility: CreateGeneralStoryRequestVisibility;
  onStoryVisibilityChange: (value: CreateGeneralStoryRequestVisibility) => void;
};

export function GeneralStoryRegisterPanel({
  genres,
  needsGenreReselection,
  allowsStoredGenres,
  onGenresChange,
  storyDescription,
  onStoryDescriptionChange,
  storyVisibility,
  onStoryVisibilityChange,
}: GeneralStoryRegisterPanelProps) {
  const { catalog, isPending, isError } = useGenreCatalog();
  const selectedTagIds = getSelectedGenreTagIds(genres);
  const isGenreMaxReached = genres.selected.length >= genre.maxCount;
  const genreError = useRegisterError(REGISTER_ERROR_KEY.genre);

  const changeGenre = (key: GeneralStoryGenreKey, pressed: boolean) => {
    if (catalog) {
      onGenresChange(
        toggleGenre(genres, key, pressed, genre.maxCount, catalog),
      );
    }
  };

  return (
    <FieldGroup className="gap-6">
      <Field
        className="gap-2"
        data-invalid={genreError ? true : undefined}
        data-register-error={genreError ? true : undefined}>
        <FieldLabel htmlFor={GENRE_SEARCH_ID} className="gap-0.5">
          {genre.label} {genre.maxCountLabel(genre.maxCount)}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </FieldLabel>
        <GenreSearchCombobox
          id={GENRE_SEARCH_ID}
          selectedIds={selectedTagIds}
          isMaxSelectionReached={isGenreMaxReached}
          onToggle={(id, pressed) => changeGenre({ kind: 'tag', id }, pressed)}
        />
        {needsGenreReselection && (
          <p className="text-sm break-keep text-foreground-secondary">
            {GENRE_SEARCH_COPY.reselect}
          </p>
        )}
        <TagChipGrid
          keyPrefix="general-story-genre"
          predefinedTags={
            catalog
              ? getGenreChips(catalog, genres.addedTagIds ?? [], selectedTagIds)
              : []
          }
          customTags={allowsStoredGenres ? genres.customTags : []}
          selectedTagIds={selectedTagIds}
          selectedCustomTagIds={genres.selected.flatMap((item) =>
            item.kind === 'custom' ? [item.id] : [],
          )}
          isMaxSelectionReached={isGenreMaxReached}
          isLoadingTags={isPending}
          hasTagsError={isError}
          disabled={false}
          onTogglePredefinedTag={(id, pressed) =>
            changeGenre({ kind: 'tag', id }, pressed)
          }
          onToggleCustomTag={(id, pressed) =>
            changeGenre({ kind: 'custom', id }, pressed)
          }
        />
        {genreError ? (
          <FieldError>{genreError}</FieldError>
        ) : (
          <FieldDescription className="break-keep text-foreground-secondary">
            {genre.description}
          </FieldDescription>
        )}
      </Field>

      <GeneralStoryInputField
        id="general-story-description"
        label={description.label}
        multiline
        heightClassName="min-h-28 max-h-70"
        maxLength={description.maxLength}
        placeholder={description.placeholder}
        description={description.description}
        registerErrorKey={REGISTER_ERROR_KEY.description}
        value={storyDescription}
        onChange={onStoryDescriptionChange}
      />

      <div className="flex items-center gap-4">
        <Field className="flex-1 gap-2">
          <FieldLabel>{visibility.label}</FieldLabel>
          <FieldDescription
            id={VISIBILITY_DESCRIPTION_ID}
            className="break-keep text-foreground-secondary">
            {visibility.description}
          </FieldDescription>
        </Field>
        <Switch
          checked={storyVisibility === 'PUBLIC'}
          onCheckedChange={(checked) =>
            onStoryVisibilityChange(checked ? 'PUBLIC' : 'PRIVATE')
          }
          ariaLabel={visibility.label}
          ariaDescribedBy={VISIBILITY_DESCRIPTION_ID}
        />
      </div>

      <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm break-keep text-foreground-secondary">
        <HugeiconsIcon
          icon={AlertCircleIcon}
          aria-hidden="true"
          className="size-4 shrink-0"
        />
        {notice}
      </p>
    </FieldGroup>
  );
}
