'use client';

import { Switch } from '@/components/motion/switch';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

import { STORY_VISIBILITY_COPY } from '../../constants';

const VISIBILITY_DESCRIPTION_ID = 'story-create-visibility-description';

type StoryVisibilitySectionProps = {
  isPublic: boolean;
  disabled: boolean;
  onPublicChange: (isPublic: boolean) => void;
};

export function StoryVisibilitySection({
  isPublic,
  disabled,
  onPublicChange,
}: StoryVisibilitySectionProps) {
  return (
    <section className="flex items-center gap-4 px-4 pt-2 pb-4">
      <Field className="flex-1 gap-2">
        <FieldLabel>{STORY_VISIBILITY_COPY.label}</FieldLabel>
        <FieldDescription
          id={VISIBILITY_DESCRIPTION_ID}
          className="break-keep text-foreground-secondary">
          {STORY_VISIBILITY_COPY.description}
        </FieldDescription>
      </Field>
      <Switch
        checked={isPublic}
        disabled={disabled}
        onCheckedChange={onPublicChange}
        ariaLabel={STORY_VISIBILITY_COPY.label}
        ariaDescribedBy={VISIBILITY_DESCRIPTION_ID}
      />
    </section>
  );
}
