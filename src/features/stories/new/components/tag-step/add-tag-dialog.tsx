'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

import { ADD_TAG_MAX_LENGTH } from '../../constants';
import { useAddTagDialog } from '../../hooks/use-add-tag-dialog';
import type { CharacterTagCategory } from '../../types';

type AddTagDialogProps = {
  category: CharacterTagCategory;
  categoryLabel: string;
  /** 인물마다 다이얼로그가 하나씩 있어 화면 안에서 유일해야 하는 필드 id */
  fieldId: string;
  placeholder: string;
  disabled?: boolean;
  onAddTag: (tag: string) => void;
};

export function AddTagDialog({
  category,
  categoryLabel,
  fieldId,
  placeholder,
  disabled,
  onAddTag,
}: AddTagDialogProps) {
  const {
    isOpen,
    handleOpenChange,
    tag,
    validationError,
    handleTagChange,
    handleSubmit,
  } = useAddTagDialog({ category, onAddTag });
  const errorId = `${fieldId}-tag-error`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            <Field
              className="gap-2"
              data-invalid={validationError ? true : undefined}
              aria-labelledby={`${fieldId}-tag`}>
              <Label htmlFor={`${fieldId}-tag`}>키워드</Label>
              <InputGroup>
                <InputGroupTextarea
                  id={`${fieldId}-tag`}
                  name="tag"
                  placeholder={placeholder}
                  maxLength={ADD_TAG_MAX_LENGTH}
                  rows={1}
                  value={tag}
                  aria-invalid={validationError ? true : undefined}
                  aria-describedby={validationError ? errorId : undefined}
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
              <FieldError id={errorId}>{validationError}</FieldError>
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
            <Button type="submit">추가하기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
