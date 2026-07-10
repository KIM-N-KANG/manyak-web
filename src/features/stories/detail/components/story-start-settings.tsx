import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StoryStartSettingsProps = {
  startSettings: StoryStartSettingResponse[];
  value: string;
  onValueChange: (value: string) => void;
};

/** 시작 설정의 Select 값. id가 없는 설정은 인덱스로 폴백한다. */
export const startSettingValue = (
  setting: StoryStartSettingResponse | undefined,
  index: number,
) => setting?.id ?? String(index);

export function StoryStartSettings({
  startSettings,
  value,
  onValueChange,
}: StoryStartSettingsProps) {
  const selected =
    startSettings.find(
      (setting, index) => startSettingValue(setting, index) === value,
    ) ?? startSettings[0];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">채팅 시작 상황</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">상황 이름</h3>
          <Select
            value={value}
            onValueChange={(next) => onValueChange(next as string)}
            items={startSettings.map((setting, index) => ({
              value: startSettingValue(setting, index),
              label: setting.name ?? `시작 상황 ${index + 1}`,
            }))}>
            <SelectTrigger className="w-full" aria-label="채팅 시작 상황 선택">
              <SelectValue />
            </SelectTrigger>
            {/* 팝업이 트리거를 덮지 않고 같은 너비로 바로 아래에 뜨도록 한다 */}
            <SelectContent alignItemWithTrigger={false}>
              {startSettings.map((setting, index) => (
                <SelectItem
                  key={startSettingValue(setting, index)}
                  value={startSettingValue(setting, index)}>
                  {setting.name ?? `시작 상황 ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected?.startSituation && (
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">상황 설명</h3>
            <TextContent>{selected.startSituation}</TextContent>
          </div>
        )}
      </div>
    </div>
  );
}
