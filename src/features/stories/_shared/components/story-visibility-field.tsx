import { useId } from 'react';

import type { CreateSimpleStoryRequestVisibility } from '@/api/generated/models';
import { Switch } from '@/components/motion/switch';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

import { STORY_VISIBILITY_COPY } from '../constants/story-visibility';

type StoryVisibilityFieldProps = {
  value: CreateSimpleStoryRequestVisibility;
  disabled?: boolean;
  onValueChange: (value: CreateSimpleStoryRequestVisibility) => void;
};

export function StoryVisibilityField({
  value,
  disabled,
  onValueChange,
}: StoryVisibilityFieldProps) {
  const descriptionId = useId();

  return (
    <div className="flex items-center gap-4">
      <Field className="flex-1 gap-2">
        <FieldLabel>{STORY_VISIBILITY_COPY.PUBLIC}</FieldLabel>
        <FieldDescription
          id={descriptionId}
          className="text-foreground-secondary">
          {STORY_VISIBILITY_COPY.publicDescription}
        </FieldDescription>
      </Field>
      <Switch
        checked={value === 'PUBLIC'}
        disabled={disabled}
        onCheckedChange={(checked) =>
          onValueChange(checked ? 'PUBLIC' : 'PRIVATE')
        }
        ariaLabel={STORY_VISIBILITY_COPY.PUBLIC}
        ariaDescribedBy={descriptionId}
      />
    </div>
  );
}
