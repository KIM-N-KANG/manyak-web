import { useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useList as usePersonas } from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { PERSONA_MAX_COUNT } from '@/features/my/_shared/constants/persona';
import { markPersonaCreationOrigin } from '@/features/stories/_shared/utils/created-persona-selection';
import { PERSONA_SELECT_COPY } from '@/features/stories/detail/constants/start-setting-copy';
import { track } from '@/observability/analytics';

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
  const router = useRouter();
  const { isMember, isGuest } = useMemberAccess();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { data } = usePersonas({ query: { enabled: isMember } });
  const personas = isMember && data?.status === 200 ? data.data : [];

  const handleCreate = () => {
    track('client_storyDetail_personaCreateButton_clicked', {
      story_id: storyId,
    });

    if (isGuest) {
      setIsLoginOpen(true);

      return;
    }

    if (!isMember) {
      return;
    }

    if (personas.length >= PERSONA_MAX_COUNT) {
      toast.error(TOAST_MESSAGE.PERSONA_LIMIT_REACHED);

      return;
    }

    markPersonaCreationOrigin(storyId);
    router.push(APP_PATH.MY_PERSONA_NEW);
  };

  const handleValueChange = (next: string) => {
    if (next === CREATE_PERSONA_VALUE) {
      handleCreate();

      return;
    }

    const nextPersonaId = next === DEFAULT_PROTAGONIST_VALUE ? null : next;

    if (nextPersonaId === value) {
      return;
    }

    track('client_storyDetail_persona_selected', {
      story_id: storyId,
      persona_type: nextPersonaId ? 'persona' : 'default',
    });
    onValueChange(nextPersonaId);
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
        <SelectContent alignItemWithTrigger={false}>
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
          <SelectItem value={CREATE_PERSONA_VALUE}>
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            {PERSONA_SELECT_COPY.create}
          </SelectItem>
        </SelectContent>
      </Select>
      <LoginRequiredSheet
        open={isLoginOpen && isGuest}
        onOpenChange={setIsLoginOpen}
      />
    </div>
  );
}
