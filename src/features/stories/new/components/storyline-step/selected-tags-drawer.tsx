'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { track } from '@/observability/analytics';

import {
  SELECTED_TAGS_DRAWER_COPY,
  SELECTED_TAGS_TRIGGER_LABEL,
} from '../../constants';
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
            className="h-10 w-full rounded-none border-0 px-0 text-foreground-secondary active:scale-100"
          />
        }>
        {SELECTED_TAGS_TRIGGER_LABEL}
      </DrawerTrigger>
      <DrawerContent container={container}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {SELECTED_TAGS_DRAWER_COPY.title}
          </DrawerTitle>
          <DrawerDescription className="text-base leading-6">
            {SELECTED_TAGS_DRAWER_COPY.description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-4 pt-8 pb-4">
          {groups.map((group) => (
            <SelectedTagGroup key={group.id} group={group} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
