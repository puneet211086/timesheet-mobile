export function localDateInputValue(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localTimeInputValue(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function combineLocalDateAndTime(
  dateValue: string,
  timeValue: string
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeValue)) return null;

  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const value = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hours ||
    value.getMinutes() !== minutes
  ) {
    return null;
  }

  return value;
}

export function entryDurationSeconds(
  clockIn: string,
  clockOut: string | null,
  now = Date.now()
): number {
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : now;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function payableDurationSeconds(
  clockIn: string,
  clockOut: string | null,
  unpaidBreakMinutes = 0,
  now = Date.now()
): number {
  const grossSeconds = entryDurationSeconds(clockIn, clockOut, now);
  const breakSeconds = Math.max(0, Math.floor(unpaidBreakMinutes)) * 60;
  return Math.max(0, grossSeconds - breakSeconds);
}
