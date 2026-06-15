'use client';

import { type SubmitEvent, useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/api/model';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AddKeywordDialogProps = {
  category: SimpleStoryCustomTagRequestCategory;
  categoryLabel: string;
  disabled?: boolean;
  onAddKeyword: (keyword: string) => void;
};

export function AddKeywordDialog({
  category,
  categoryLabel,
  disabled,
  onAddKeyword,
}: AddKeywordDialogProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    onAddKeyword(trimmedKeyword);
    setKeyword('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            className="text-foreground-secondary"
            disabled={disabled}>
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            직접 추가
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{categoryLabel} 키워드 직접 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="contents">
          <FieldGroup>
            <Field>
              <Label htmlFor={`${category}-keyword`}>키워드</Label>
              <Input
                id={`${category}-keyword`}
                name="keyword"
                placeholder="추가할 키워드를 입력해주세요"
                maxLength={10}
                value={keyword}
                onChange={(event) =>
                  setKeyword(event.target.value.slice(0, 10))
                }
              />
              <FieldDescription>10자 이내로 입력하세요</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="secondary">
                  닫기
                </Button>
              }
            />
            <Button type="submit" disabled={keyword.trim().length === 0}>
              추가하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
