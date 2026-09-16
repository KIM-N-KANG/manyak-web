'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { track } from '@/observability/analytics';

import { SELECTED_TAGS_TRIGGER_LABEL } from '../../constants';
import type { SelectedTagGroup as SelectedTagGroupModel } from '../../types';
import { SelectedTagGroup } from '../tag-step/selected-tag-group';

type SelectedTagsDrawerProps = {
  groups: SelectedTagGroupModel[];
  creationId?: string;
};

export function SelectedTagsDrawer({
  groups,
  creationId,
}: SelectedTagsDrawerProps) {
  const container = useAppFrameContainer();

  if (groups.length === 0) {
    return null;
  }

  return (
    <Drawer
      onOpenChange={(open) => {
        if (open && creationId) {
          track('client_storyCreate_selectedTagsButton_clicked', {
            creation_id: creationId,
          });
        }
      }}>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            // 전체 폭 바 형태라 일반 버튼의 눌림 축소 효과를 끈다.
            className="h-10 w-full rounded-none px-0 text-foreground-secondary active:scale-100"
          />
        }>
        {SELECTED_TAGS_TRIGGER_LABEL}
      </DrawerTrigger>
      <DrawerContent container={container}>
        <DrawerHeader>
          <DrawerTitle>선택한 키워드</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain p-4">
          {groups.map((group) => (
            <SelectedTagGroup key={group.id} group={group} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
