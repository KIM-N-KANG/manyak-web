import { type Ref, useState } from 'react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { getMinLengthError } from '@/features/studio/general/utils/general-story-text-error';

type GeneralStoryInputFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  /** 여러 줄 입력의 최소·최대 높이 클래스다. */
  heightClassName?: string;
  maxLength?: number;
  placeholder?: string;
  description?: string;
  /** 최소 글자 수 오류보다 먼저 보이는 오류다. */
  error?: string | null;
  inputMode?: 'numeric';
  /** 한 줄 입력 오른쪽 끝에 붙는 단위다. 글자 수 대신 표시한다. */
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  /** 한 줄 입력 요소 ref다. 동적으로 추가한 칸으로 스크롤할 때 쓴다. */
  inputRef?: Ref<HTMLInputElement>;
};

export function GeneralStoryInputField({
  id,
  label,
  required = false,
  multiline = false,
  heightClassName = 'min-h-24',
  maxLength,
  placeholder,
  description,
  error,
  inputMode,
  suffix,
  value,
  onChange,
  inputRef,
}: GeneralStoryInputFieldProps) {
  const [isTouched, setIsTouched] = useState(false);
  const shownError =
    error ??
    (isTouched && inputMode !== 'numeric'
      ? getMinLengthError(label, value)
      : null);
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const controlProps = {
    id,
    value,
    maxLength,
    placeholder,
    inputMode,
    'aria-describedby': shownError
      ? errorId
      : description
        ? descriptionId
        : undefined,
    'aria-invalid': shownError ? true : undefined,
    'aria-required': required,
    onBlur: () => setIsTouched(true),
  };
  const addon =
    suffix ?? (maxLength !== undefined && `${value.length} / ${maxLength}`);

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id} className="gap-0.5">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <InputGroup>
        {multiline ? (
          <InputGroupTextarea
            {...controlProps}
            className={heightClassName}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <InputGroupInput
            {...controlProps}
            ref={inputRef}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {addon && (
          <InputGroupAddon align={multiline ? 'block-end' : 'inline-end'}>
            <InputGroupText>{addon}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {shownError ? (
        <FieldError id={errorId}>{shownError}</FieldError>
      ) : (
        description && (
          <FieldDescription
            id={descriptionId}
            className="break-keep text-foreground-secondary">
            {description}
          </FieldDescription>
        )
      )}
    </Field>
  );
}
