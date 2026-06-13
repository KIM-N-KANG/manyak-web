export const safeParseInt = (value: string | string[] | undefined): number => {
  if (!value || Array.isArray(value)) {
    return NaN;
  }

  const parsed = Number(value);

  return isNaN(parsed) ? NaN : parsed;
};
