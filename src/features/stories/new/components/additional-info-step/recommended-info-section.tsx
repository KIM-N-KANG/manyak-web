'use client';

import type { SimpleStoryRecommendedInfoResponse } from '@/api/generated/models';
import { Label } from '@/components/ui/label';
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
      className="mt-4 flex flex-col gap-2 p-4">
      <Label>추천 추가 정보</Label>
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
