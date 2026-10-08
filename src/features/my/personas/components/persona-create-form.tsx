'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import {
  PERSONA_CREATE_COPY,
  PERSONA_FEATURE_MAX_LENGTH,
  PERSONA_NAME_MAX_LENGTH,
} from '../constants';
import { usePersonaCreateForm } from '../hooks/use-persona-create-form';
import {
  PERSONA_GENDER_TEXT,
  type PersonaGender,
} from '../utils/persona-description';

const GENDER_OPTIONS = (
  Object.entries(PERSONA_GENDER_TEXT) as [PersonaGender, string][]
).map(([value, label]) => ({ value, label }));

const GENDER_ITEMS = [
  { value: null, label: PERSONA_CREATE_COPY.genderPlaceholder },
  ...GENDER_OPTIONS,
];

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
);

export function PersonaCreateForm() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    track('client_personaCreate_viewed');
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

  const {
    name,
    gender,
    feature,
    errors,
    handleNameChange,
    handleGenderChange,
    handleFeatureChange,
    handleSubmit,
    isSubmitting,
  } = usePersonaCreateForm();
  const basicInfoError = errors.name ?? errors.gender;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-start gap-1 p-4">
          <p className="text-xl font-semibold">{PERSONA_CREATE_COPY.title}</p>
          <p className="text-foreground-secondary">
            {PERSONA_CREATE_COPY.description}
          </p>
        </div>

        <FieldGroup className="gap-6 p-4">
          <Field className="gap-2">
            <FieldLabel htmlFor="persona-name" className="gap-0.5">
              {PERSONA_CREATE_COPY.basicInfoLabel}
              <RequiredMark />
            </FieldLabel>
            <div className="flex items-start gap-2">
              <InputGroup className="min-w-0 flex-[3]">
                <InputGroupInput
                  id="persona-name"
                  aria-label={PERSONA_CREATE_COPY.nameLabel}
                  aria-required
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={
                    basicInfoError ? 'persona-basic-info-error' : undefined
                  }
                  maxLength={PERSONA_NAME_MAX_LENGTH}
                  placeholder={PERSONA_CREATE_COPY.namePlaceholder}
                  value={name}
                  disabled={isSubmitting}
                  onChange={(event) => handleNameChange(event.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    {name.length} / {PERSONA_NAME_MAX_LENGTH}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <Select
                value={gender}
                items={GENDER_ITEMS}
                disabled={isSubmitting}
                onValueChange={(next) =>
                  handleGenderChange(next as PersonaGender)
                }>
                <SelectTrigger
                  className={cn(
                    'min-w-0 flex-[2]',
                    gender === null && 'text-foreground-tertiary',
                  )}
                  aria-label={PERSONA_CREATE_COPY.genderLabel}
                  aria-required
                  aria-invalid={errors.gender ? true : undefined}
                  aria-describedby={
                    basicInfoError ? 'persona-basic-info-error' : undefined
                  }>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {GENDER_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {basicInfoError ? (
              <FieldError id="persona-basic-info-error">
                {basicInfoError}
              </FieldError>
            ) : (
              <FieldDescription className="break-keep text-foreground-secondary">
                {PERSONA_CREATE_COPY.basicInfoDescription}
              </FieldDescription>
            )}
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="persona-feature" className="gap-0.5">
              {PERSONA_CREATE_COPY.featureLabel}
              <RequiredMark />
            </FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="persona-feature"
                aria-required
                aria-invalid={errors.feature ? true : undefined}
                aria-describedby={
                  errors.feature ? 'persona-feature-error' : undefined
                }
                maxLength={PERSONA_FEATURE_MAX_LENGTH}
                placeholder={PERSONA_CREATE_COPY.featurePlaceholder}
                value={feature}
                disabled={isSubmitting}
                className="max-h-70 min-h-28"
                onChange={(event) => handleFeatureChange(event.target.value)}
              />
              <InputGroupAddon align="block-end">
                <InputGroupText>
                  {feature.length} / {PERSONA_FEATURE_MAX_LENGTH}
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {errors.feature ? (
              <FieldError id="persona-feature-error">
                {errors.feature}
              </FieldError>
            ) : (
              <FieldDescription className="break-keep text-foreground-secondary">
                {PERSONA_CREATE_COPY.featureDescription}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </div>

      <div className="flex shrink-0 flex-col px-4 pb-4">
        <Button
          type="submit"
          size="lg"
          className="relative w-full"
          aria-busy={isSubmitting}
          disabled={isSubmitting}>
          <LoadingButtonContent
            isLoading={isSubmitting}
            loadingLabel={PERSONA_CREATE_COPY.submitting}>
            {PERSONA_CREATE_COPY.submit}
          </LoadingButtonContent>
        </Button>
      </div>
    </form>
  );
}
