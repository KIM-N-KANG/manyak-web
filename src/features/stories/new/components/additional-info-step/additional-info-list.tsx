'use client';

import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
  ADDITIONAL_INFO_PLACEHOLDERS,
} from '../../constants';
import type { AdditionalInfoInput } from '../../types';

type AdditionalInfoListProps = {
  additionalInfos: AdditionalInfoInput[];
  canAddAdditionalInfo: boolean;
  disabled: boolean;
  onAddAdditionalInfo: () => void;
  onRemoveAdditionalInfo: (id: string) => void;
  onChangeAdditionalInfo: (
    id: string,
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  onRegisterAdditionalInfoInput: (
    id: string,
    element: HTMLTextAreaElement | null,
  ) => void;
};

export function AdditionalInfoList({
  additionalInfos,
  canAddAdditionalInfo,
  disabled,
  onAddAdditionalInfo,
  onRemoveAdditionalInfo,
  onChangeAdditionalInfo,
  onRegisterAdditionalInfoInput,
}: AdditionalInfoListProps) {
  return (
    <section
      aria-labelledby="additional-info-label"
      className="flex flex-col gap-2 px-4 pt-2 pb-6">
      <div className="flex items-baseline gap-1">
        <Label>추가 정보</Label>
        <p className="text-sm text-foreground">
          (최대 {ADDITIONAL_INFO_MAX_COUNT}개)
        </p>
      </div>

      {additionalInfos.map((additionalInfo, index) => (
        <div key={additionalInfo.id} className="flex items-center gap-1">
          <InputGroup>
            <InputGroupTextarea
              ref={(element) =>
                onRegisterAdditionalInfoInput(additionalInfo.id, element)
              }
              aria-label={`추가 정보 ${index + 1}`}
              className="min-h-10"
              maxLength={ADDITIONAL_INFO_MAX_LENGTH}
              placeholder={
                ADDITIONAL_INFO_PLACEHOLDERS[
                  index % ADDITIONAL_INFO_PLACEHOLDERS.length
                ]
              }
              rows={1}
              value={additionalInfo.value}
              disabled={disabled}
              onChange={(event) =>
                onChangeAdditionalInfo(additionalInfo.id, event)
              }
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>
                {additionalInfo.value.length} / {ADDITIONAL_INFO_MAX_LENGTH}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`추가 정보 ${index + 1} 삭제`}
            disabled={disabled}
            onClick={() => onRemoveAdditionalInfo(additionalInfo.id)}
            className="shrink-0 text-foreground-secondary">
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="self-center"
        disabled={!canAddAdditionalInfo || disabled}
        onClick={onAddAdditionalInfo}>
        <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
        정보 추가
      </Button>
    </section>
  );
}
