import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { CreateGeneralStoryRequestVisibility } from '@/api/generated/models';
import { Switch } from '@/components/motion/switch';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { AddTagDialog } from '@/features/stories/_shared/components/add-tag-dialog';
import { TagChipGrid } from '@/features/stories/_shared/components/tag-chip-grid';
import { GENERAL_STORY_REGISTER_COPY } from '@/features/studio/general/constants';
import {
  type GeneralStoryGenreSelection,
  toggleGenre,
} from '@/features/studio/general/utils/genre-selection';

import { GeneralStoryInputField } from './general-story-input-field';

const { genre, description, visibility, notice } = GENERAL_STORY_REGISTER_COPY;

const VISIBILITY_DESCRIPTION_ID = 'general-story-visibility-description';

type GeneralStoryRegisterPanelProps = {
  genres: GeneralStoryGenreSelection;
  onGenresChange: (genres: GeneralStoryGenreSelection) => void;
  storyDescription: string;
  onStoryDescriptionChange: (value: string) => void;
  storyVisibility: CreateGeneralStoryRequestVisibility;
  onStoryVisibilityChange: (value: CreateGeneralStoryRequestVisibility) => void;
};

export function GeneralStoryRegisterPanel({
  genres,
  onGenresChange,
  storyDescription,
  onStoryDescriptionChange,
  storyVisibility,
  onStoryVisibilityChange,
}: GeneralStoryRegisterPanelProps) {
  const tags = useGetSimpleStoryTags();
  const genreTags =
    tags.data?.status === 200
      ? tags.data.data.filter(({ category }) => category === 'GENRE')
      : [];
  const isGenreMaxReached = genres.selected.length >= genre.maxCount;

  const addCustomGenre = (name: string) => {
    if (isGenreMaxReached) {
      return;
    }

    const id = crypto.randomUUID();

    onGenresChange({
      customTags: [...genres.customTags, { id, name }],
      selected: [...genres.selected, { kind: 'custom', id }],
    });
  };

  return (
    <FieldGroup className="gap-6">
      <Field className="gap-2">
        <FieldLabel className="gap-0.5">
          {genre.label} {genre.maxCountLabel(genre.maxCount)}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </FieldLabel>
        <TagChipGrid
          keyPrefix="general-story-genre"
          predefinedTags={genreTags}
          customTags={genres.customTags}
          selectedTagIds={genres.selected.flatMap((item) =>
            item.kind === 'tag' ? [item.id] : [],
          )}
          selectedCustomTagIds={genres.selected.flatMap((item) =>
            item.kind === 'custom' ? [item.id] : [],
          )}
          isMaxSelectionReached={isGenreMaxReached}
          isLoadingTags={tags.isPending}
          hasTagsError={tags.isError}
          disabled={false}
          addTagTrigger={
            <AddTagDialog
              categoryLabel={genre.label}
              fieldId="general-story-genre"
              placeholder={genre.addPlaceholder}
              disabled={isGenreMaxReached}
              onAddTag={addCustomGenre}
            />
          }
          onTogglePredefinedTag={(id, pressed) =>
            onGenresChange(
              toggleGenre(genres, { kind: 'tag', id }, pressed, genre.maxCount),
            )
          }
          onToggleCustomTag={(id, pressed) =>
            onGenresChange(
              toggleGenre(
                genres,
                { kind: 'custom', id },
                pressed,
                genre.maxCount,
              ),
            )
          }
        />
        <FieldDescription className="break-keep text-foreground-secondary">
          {genre.description}
        </FieldDescription>
      </Field>

      <GeneralStoryInputField
        id="general-story-description"
        label={description.label}
        multiline
        heightClassName="min-h-28 max-h-70"
        maxLength={description.maxLength}
        placeholder={description.placeholder}
        description={description.description}
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
