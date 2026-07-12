'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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

import { ADD_TAG_MAX_LENGTH } from '../../constants';
import { useAddTagDialog } from '../../hooks/use-add-tag-dialog';

type AddTagDialogProps = {
  category: SimpleStoryCustomTagRequestCategory;
  categoryLabel: string;
  placeholder: string;
  disabled?: boolean;
  onAddTag: (tag: string) => void;
};

export function AddTagDialog({
  category,
  categoryLabel,
  placeholder,
  disabled,
  onAddTag,
}: AddTagDialogProps) {
  const {
    isOpen,
    setIsOpen,
    tag,
    handleTagChange,
    handleSubmit,
    isSubmitDisabled,
  } = useAddTagDialog({ category, onAddTag });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="secondary" disabled={disabled}>
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            키워드 추가
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{categoryLabel} 키워드 추가</DialogTitle>
          <DialogDescription>원하는 키워드를 입력해주세요</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="contents">
          <FieldGroup>
            <Field className="gap-2" aria-labelledby={`${category}-tag`}>
              <Label htmlFor={`${category}-tag`}>키워드</Label>
              <InputGroup>
                <InputGroupTextarea
                  id={`${category}-tag`}
                  name="tag"
                  placeholder={placeholder}
                  maxLength={ADD_TAG_MAX_LENGTH}
                  rows={1}
                  value={tag}
                  onChange={handleTagChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    {tag.length} / {ADD_TAG_MAX_LENGTH}
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
