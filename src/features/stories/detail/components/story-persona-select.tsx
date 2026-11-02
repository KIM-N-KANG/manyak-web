import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { PERSONA_SELECT_COPY } from '@/features/stories/detail/constants/start-setting-copy';
import { useDetailPersonas } from '@/features/stories/detail/hooks/use-detail-personas';

import { StoryInfoHeading } from './story-info-heading';

const DEFAULT_PROTAGONIST_VALUE = 'default-protagonist';
const CREATE_PERSONA_VALUE = 'create-persona';

type StoryPersonaSelectProps = {
  storyId: string;
  /** 선택한 페르소나 ID. null이면 기본 주인공이다. */
  value: string | null;
  onValueChange: (personaId: string | null) => void;
};

export function StoryPersonaSelect({
  storyId,
  value,
  onValueChange,
}: StoryPersonaSelectProps) {
  const { personas, createPersona, isLoginOpen, setIsLoginOpen } =
    useDetailPersonas(storyId);

  const handleValueChange = (next: string) => {
    if (next === CREATE_PERSONA_VALUE) {
      createPersona();

      return;
    }

    onValueChange(next === DEFAULT_PROTAGONIST_VALUE ? null : next);
  };

  return (
    <div className="flex flex-col gap-4">
      <StoryInfoHeading title={PERSONA_SELECT_COPY.title}>
        {PERSONA_SELECT_COPY.info}
      </StoryInfoHeading>
      <Select
        value={value ?? DEFAULT_PROTAGONIST_VALUE}
        onValueChange={(next) => handleValueChange(next as string)}
        items={[
          {
            value: DEFAULT_PROTAGONIST_VALUE,
            label: PERSONA_SELECT_COPY.defaultProtagonist,
          },
          ...personas.map((persona) => ({
            value: persona.id ?? '',
            label: persona.name ?? '',
          })),
        ]}>
        <SelectTrigger
          className="w-full"
          aria-label={PERSONA_SELECT_COPY.selectLabel}>
          <SelectValue className="block min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className="max-h-[min(var(--available-height),18.75rem)]"
          footer={
            <>
              <SelectSeparator />
              <SelectItem value={CREATE_PERSONA_VALUE}>
                <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
                {PERSONA_SELECT_COPY.create}
              </SelectItem>
            </>
          }>
          <SelectItem value={DEFAULT_PROTAGONIST_VALUE}>
            {PERSONA_SELECT_COPY.defaultProtagonist}
          </SelectItem>
          {personas.map((persona) =>
            persona.id ? (
              <SelectItem
                key={persona.id}
                value={persona.id}
                className="h-auto min-h-10 py-2">
                <span className="min-w-0 wrap-anywhere whitespace-normal">
                  {persona.name}
                </span>
              </SelectItem>
            ) : null,
          )}
        </SelectContent>
      </Select>
      <LoginRequiredSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  );
}
