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

export function AddKeywordDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="secondary" className="text-foreground-secondary">
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            키워드 추가
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>키워드 추가</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="keyword">키워드</Label>
            <Input
              id="add keyword"
              name="keyword"
              placeholder="추가할 키워드를 입력해주세요"
            />
            <FieldDescription>10자 이내로 입력하세요</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary">닫기</Button>} />
          <Button type="submit">추가하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
