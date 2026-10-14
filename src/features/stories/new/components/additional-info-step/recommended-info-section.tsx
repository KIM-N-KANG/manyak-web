'use client';

import type { SimpleStoryRecommendedInfoResponse } from '@/api/generated/models';
import { FieldLabel } from '@/components/ui/field';
import { ToggleChip } from '@/components/ui/toggle-chip';

type RecommendedInfoSectionProps = {
  recommendedInfos: SimpleStoryRecommendedInfoResponse[];
  selectedRecommendations: Set<string>;
  disabled: boolean;
  onToggleRecommendation: (recommendation: string, pressed: boolean) => void;
};

export function RecommendedInfoSection({
  recommendedInfos,
  selectedRecommendations,
  disabled,
  onToggleRecommendation,
}: RecommendedInfoSectionProps) {
  return (
    <section
      aria-labelledby="recommended-info-label"
      className="flex flex-col gap-2 px-4">
      <FieldLabel id="recommended-info-label">추천 추가 정보</FieldLabel>
      <ul className="flex flex-col gap-2">
        {recommendedInfos.map((recommendedInfo, index) => {
          const recommendation = recommendedInfo.text ?? '';

          if (!recommendation) {
            return null;
          }

          return (
            <li key={recommendedInfo.id ?? index}>
              <ToggleChip
                className="h-auto w-full justify-start text-left whitespace-normal"
                pressed={selectedRecommendations.has(recommendation)}
                disabled={disabled}
                onPressedChange={(pressed) =>
                  onToggleRecommendation(recommendation, pressed)
                }>
                {recommendation}
              </ToggleChip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
