function toInputDateValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function dateFromInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function getTodayInputValue() {
  return toInputDateValue(new Date());
}

export function addDaysToInputDate(value: string, days: number) {
  const date = dateFromInputValue(value);

  date.setDate(date.getDate() + days);

  return toInputDateValue(date);
}

export function isWorkWeekDate(value: string) {
  const dayOfWeek = dateFromInputValue(value).getDay();

  return dayOfWeek >= 0 && dayOfWeek <= 4;
}

export function getCurrentWorkWeekRange(reference = new Date()) {
  const referenceDate = new Date(reference);
  const start = new Date(referenceDate);

  start.setHours(12, 0, 0, 0);
  start.setDate(referenceDate.getDate() - referenceDate.getDay());

  const end = new Date(start);

  end.setDate(start.getDate() + 4);

  return {
    from: toInputDateValue(start),
    to: toInputDateValue(end),
  };
}
