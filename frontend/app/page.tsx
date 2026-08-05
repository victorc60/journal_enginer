import HomeDashboardClient from "@/components/HomeDashboardClient";
import { buildQuery, fetchJson } from "@/lib/api";
import { ActivityCalendarResponse } from "@/lib/types";

function getCurrentMonthKey() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 7);
}

export default async function HomePage() {
  let initialCalendar: ActivityCalendarResponse | null = null;
  let initialCalendarError: string | null = null;

  try {
    initialCalendar = await fetchJson<ActivityCalendarResponse>(
      `/api/activity-calendar${buildQuery({ month: getCurrentMonthKey() })}`,
    );
  } catch (error) {
    initialCalendarError = error instanceof Error ? error.message : "Не удалось загрузить календарь.";
  }

  return <HomeDashboardClient initialCalendar={initialCalendar} initialCalendarError={initialCalendarError} />;
}
