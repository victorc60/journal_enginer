import Link from "next/link";
import DashboardCharts from "./dashboard-charts";

type SummaryResponse = {
  total_shifts: number;
  average_heads_count: number | null;
  average_co2_per_head_g: number | null;
  total_failures: number;
};

type Co2Response = {
  co2_usage_by_date: Array<{
    shift_date: string;
    co2_used_kg: number | null;
  }>;
  co2_per_head_by_date: Array<{
    shift_date: string;
    co2_per_head_g: number | null;
  }>;
};

type FailuresResponse = {
  failures_by_equipment: Array<{
    equipment_name: string;
    failures_count: number;
  }>;
};

type TemperaturesResponse = {
  meat_temperature_by_date: Array<{
    shift_date: string;
    meat_temp_c: number | null;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function formatMetric(value: number | null, suffix = "") {
  if (value === null || value === undefined) {
    return "—";
  }

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);

  return suffix ? `${formatted} ${suffix}` : formatted;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load ${path}.`);
  }

  return (await response.json()) as T;
}

export default async function DashboardPage() {
  const [summary, co2, failures, temperatures] = await Promise.all([
    fetchJson<SummaryResponse>("/api/analytics/summary"),
    fetchJson<Co2Response>("/api/analytics/co2"),
    fetchJson<FailuresResponse>("/api/analytics/failures"),
    fetchJson<TemperaturesResponse>("/api/analytics/temperatures"),
  ]);

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card dashboard-card">
        <Link href="/" className="back-link">
          Back
        </Link>

        <p className="eyebrow">Dashboard</p>
        <h1>Analytics</h1>
        <p className="intro">Track output, CO2 efficiency, failures, and temperature trends across saved shifts.</p>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Total shifts</p>
            <p className="stat-value">{summary.total_shifts}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Average heads</p>
            <p className="stat-value">{formatMetric(summary.average_heads_count)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Average CO2 g/head</p>
            <p className="stat-value">{formatMetric(summary.average_co2_per_head_g, "g")}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Total failures</p>
            <p className="stat-value">{summary.total_failures}</p>
          </article>
        </div>

        <DashboardCharts
          co2PerHeadByDate={co2.co2_per_head_by_date}
          meatTemperatureByDate={temperatures.meat_temperature_by_date}
          failuresByEquipment={failures.failures_by_equipment}
        />
      </section>
    </main>
  );
}
