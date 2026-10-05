import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChatCharacterImage } from '@/features/chats/_shared/components/chat-character-image';
import {
  getChatImageAlt,
  parseChatMessageSegments,
} from '@/features/chats/_shared/utils/chat-message-segments';
import { START_SETTING_INFO_COPY } from '@/features/stories/detail/constants/start-setting-copy';

type StoryStartSettingsProps = {
  startSettings: StoryStartSettingResponse[];
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * 시작 설정의 Select 값. id가 없는 설정은 인덱스로 폴백한다.
 *
 * @param setting 대상 시작 설정(없을 수 있음)
 * @param index 목록 내 인덱스(id 폴백용)
 * @returns 설정 id 또는 인덱스 문자열
 */
export const startSettingValue = (
  setting: StoryStartSettingResponse | undefined,
  index: number,
) => setting?.id ?? String(index);

function InfoHeading({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <h3 className="font-semibold">{title}</h3>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${title} 안내`}
              className="text-foreground-secondary"
            />
          }>
          <HugeiconsIcon
            icon={InformationCircleIcon}
            className="size-4"
            aria-hidden="true"
          />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-auto max-w-60 gap-0 px-3 py-2">
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function StoryStartSettings({
  startSettings,
  value,
  onValueChange,
}: StoryStartSettingsProps) {
  const selected =
    startSettings.find(
      (setting, index) => startSettingValue(setting, index) === value,
    ) ?? startSettings[0];
  const endings = (selected?.endings ?? []).flatMap((ending) =>
    ending.name ? [ending.name] : [],
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">채팅 시작 상황</h2>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <InfoHeading title="상황 이름">
            {START_SETTING_INFO_COPY.situation}
          </InfoHeading>
          <Select
            value={value}
            onValueChange={(next) => onValueChange(next as string)}
            items={startSettings.map((setting, index) => ({
              value: startSettingValue(setting, index),
              label: setting.name ?? `시작 상황 ${index + 1}`,
            }))}>
            <SelectTrigger className="w-full" aria-label="채팅 시작 상황 선택">
              <SelectValue className="block min-w-0 truncate" />
            </SelectTrigger>
            {/* 팝업이 트리거를 덮지 않고 같은 너비로 바로 아래에 뜨도록 한다 */}
            <SelectContent alignItemWithTrigger={false}>
              {startSettings.map((setting, index) => (
                <SelectItem
                  key={startSettingValue(setting, index)}
                  value={startSettingValue(setting, index)}
                  className="h-auto min-h-10 py-2">
                  <span className="min-w-0 wrap-anywhere whitespace-normal">
                    {setting.name ?? `시작 상황 ${index + 1}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold">상황 설명</h3>
            {/* 오리지널 스토리의 시작 상황에는 채팅 본문과 같은 이미지 마커가 들어 있다(KNK-1545) */}
            <div className="flex flex-col gap-7">
              {parseChatMessageSegments(selected.startSituation ?? '').map(
                (segment, index) =>
                  segment.type === 'text' ? (
                    <TextContent key={`text-${index}`}>
                      {segment.content}
                    </TextContent>
                  ) : (
                    <ChatCharacterImage
                      key={`image-${index}`}
                      alt={getChatImageAlt(segment)}
                      imageUrl={segment.imageUrl}
                    />
                  ),
              )}
            </div>
          </div>
        ) : null}
        {endings.length > 0 ? (
          <div className="flex flex-col gap-4">
            <InfoHeading title="엔딩">
              {START_SETTING_INFO_COPY.ending}
            </InfoHeading>
            <div className="flex flex-col gap-2">
              {endings.map((ending, index) => (
                <div
                  key={`${ending}-${index}`}
                  className="flex min-h-10 items-center rounded-md bg-muted px-3.5 py-2 text-sm wrap-anywhere">
                  {ending}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
