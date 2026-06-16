'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
import type { SimpleStoryCustomTagRequestCategory } from '@/services/generated/api/model';

import { ADD_KEYWORD_MAX_LENGTH } from '../constants';
import { useAddKeywordDialog } from '../hooks/use-add-keyword-dialog';

type AddKeywordDialogProps = {
  category: SimpleStoryCustomTagRequestCategory;
  categoryLabel: string;
  placeholder: string;
  disabled?: boolean;
  onAddKeyword: (keyword: string) => void;
};

export function AddKeywordDialog({
  category,
  categoryLabel,
  placeholder,
  disabled,
  onAddKeyword,
}: AddKeywordDialogProps) {
  const {
    open,
    setOpen,
    keyword,
    handleKeywordChange,
    handleSubmit,
    isSubmitDisabled,
  } = useAddKeywordDialog({ onAddKeyword });

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
            키워드 추가
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{categoryLabel} 키워드 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="contents">
          <FieldGroup>
            <Field>
              <Label htmlFor={`${category}-keyword`}>키워드</Label>
              <Input
                id={`${category}-keyword`}
                name="keyword"
                placeholder={placeholder}
                maxLength={ADD_KEYWORD_MAX_LENGTH}
                value={keyword}
                onChange={handleKeywordChange}
              />
              <FieldDescription>10자 이내로 입력해주세요</FieldDescription>
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
            <Button type="submit" disabled={isSubmitDisabled}>
              추가하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
