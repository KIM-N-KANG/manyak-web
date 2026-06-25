'use client';

import { LayoutAlignBottomIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import type { SelectedKeywordGroup as SelectedKeywordGroupModel } from '../types';
import { SelectedKeywordGroup } from './selected-keyword-group';

type SelectedKeywordsDrawerProps = {
  groups: SelectedKeywordGroupModel[];
};

export function SelectedKeywordsDrawer({
  groups,
}: SelectedKeywordsDrawerProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="선택한 키워드 보기 버튼">
          <HugeiconsIcon icon={LayoutAlignBottomIcon} aria-hidden="true" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader>
          <DrawerTitle>선택한 키워드</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-8 overflow-y-auto p-4 pb-8">
          {groups.map((group) => (
            <SelectedKeywordGroup key={group.category} group={group} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
