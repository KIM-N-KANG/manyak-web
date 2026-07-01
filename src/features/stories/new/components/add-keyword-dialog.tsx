'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/models';
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
import { Field, FieldGroup } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

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
  } = useAddKeywordDialog({ category, onAddKeyword });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="secondary" disabled={disabled}>
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
              <InputGroup>
                <InputGroupTextarea
                  id={`${category}-keyword`}
                  name="keyword"
                  placeholder={placeholder}
                  className="min-h-10"
                  maxLength={ADD_KEYWORD_MAX_LENGTH}
                  rows={1}
                  value={keyword}
                  onChange={handleKeywordChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    {keyword.length} / {ADD_KEYWORD_MAX_LENGTH}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
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
