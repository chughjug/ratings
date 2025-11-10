export type ParsableDate = string | number | Date | null | undefined;

const normalizeYear = (year: number) => {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }
  return year;
};

const buildDate = (year: number, month: number, day: number): Date | null => {
  const safeYear = normalizeYear(year);
  const date = new Date(safeYear, month, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const parseDateSafe = (value: ParsableDate): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const dateFromNumber = new Date(value);
    return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalizedWhitespace = raw.replace(/\s+/g, ' ');
  const substitutions = [
    normalizedWhitespace,
    normalizedWhitespace.replace(/ /g, 'T')
  ];

  for (const candidate of substitutions) {
    const directDate = new Date(candidate);
    if (!Number.isNaN(directDate.getTime())) {
      return directDate;
    }
  }

  const slashSeparated = normalizedWhitespace.replace(/\./g, '/');
  const slashMatch = slashSeparated.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (slashMatch) {
    const [, monthStr, dayStr, yearStr] = slashMatch;
    const parsedDate = buildDate(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
    if (parsedDate) {
      return parsedDate;
    }
  }

  const isoMatch = normalizedWhitespace.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const parsedDate = buildDate(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
    if (parsedDate) {
      return parsedDate;
    }
  }

  const compactMatch = normalizedWhitespace.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, yearStr, monthStr, dayStr] = compactMatch;
    const parsedDate = buildDate(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
    if (parsedDate) {
      return parsedDate;
    }
  }

  if (/^\d+$/.test(normalizedWhitespace)) {
    const numericValue = Number(normalizedWhitespace);
    const numericDate = new Date(numericValue);
    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate;
    }
  }

  return null;
};

export const calculateDaysUntil = (
  target: ParsableDate,
  reference: Date = new Date()
): number | null => {
  const targetDate = parseDateSafe(target);
  if (!targetDate) {
    return null;
  }
  const diffMs = targetDate.getTime() - reference.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const formatDateSafe = (
  value: ParsableDate,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  const date = parseDateSafe(value);
  if (!date) {
    return '';
  }

  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toISOString().split('T')[0];
  }
};





