import { InlineSlider } from '@/components/motion/range-slider-inline';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { GENERAL_STORY_LENGTH_RATIO_COPY } from '@/features/studio/general/constants';
import {
  formatLengthRatio,
  LENGTH_RATIO_MAX,
  LENGTH_RATIO_MIN,
} from '@/features/studio/general/utils/story-setting-sections';

type GeneralStoryLengthRatioFieldProps = {
  descriptionRatio: number;
  onChange: (descriptionRatio: number) => void;
};

export function GeneralStoryLengthRatioField({
  descriptionRatio,
  onChange,
}: GeneralStoryLengthRatioFieldProps) {
  return (
    <Field className="gap-2">
      <FieldLabel id="general-story-length-ratio-label">
        {GENERAL_STORY_LENGTH_RATIO_COPY.label}
      </FieldLabel>
      <InlineSlider
        label={`${GENERAL_STORY_LENGTH_RATIO_COPY.descriptionPart} ${descriptionRatio}`}
        format={(value) =>
          `${GENERAL_STORY_LENGTH_RATIO_COPY.dialoguePart} ${10 - value}`
        }
        formatValueText={formatLengthRatio}
        aria-label={GENERAL_STORY_LENGTH_RATIO_COPY.label}
        min={LENGTH_RATIO_MIN}
        max={LENGTH_RATIO_MAX}
        step={1}
        value={descriptionRatio}
        onValueChange={onChange}
      />
      <FieldDescription className="break-keep text-foreground-secondary">
        {GENERAL_STORY_LENGTH_RATIO_COPY.description}
      </FieldDescription>
    </Field>
  );
}
