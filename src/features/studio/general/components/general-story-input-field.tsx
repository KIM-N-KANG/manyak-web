import type { ReactNode, Ref } from 'react';

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

type GeneralStoryInputFieldProps = {
  id: string;
  label: ReactNode;
  required?: boolean;
  multiline?: boolean;
  /** 여러 줄 입력의 최소·최대 높이 클래스다. */
  heightClassName?: string;
  maxLength?: number;
  placeholder?: string;
  description?: string;
  error?: string | null;
  inputMode?: 'numeric';
  /** 한 줄 입력 오른쪽 끝에 붙는 단위다. 글자 수 대신 표시한다. */
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
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
  onBlur,
  inputRef,
}: GeneralStoryInputFieldProps) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const controlProps = {
    id,
    value,
    maxLength,
    placeholder,
    inputMode,
    'aria-describedby': error
      ? errorId
      : description
        ? descriptionId
        : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': required,
    onBlur,
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
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
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
